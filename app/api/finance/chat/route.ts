import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Create a new construction project/job',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name e.g. "Smith Kitchen Extension"' },
          client_name: { type: 'string', description: 'Client full name or company' },
          client_contact: { type: 'string', description: 'Phone or email (optional)' },
          contract_value: { type: 'number', description: 'Total contract value in GBP (excluding VAT)' },
          start_date: { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        },
        required: ['name', 'client_name', 'contract_value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: 'Log a new invoice sent to a client',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'UUID of the project (from context list)' },
          type: {
            type: 'string',
            enum: ['deposit', 'monthly', 'milestone', 'final', 'variation'],
            description: 'Invoice type. Use deposit for the initial 30% payment.',
          },
          amount: { type: 'number', description: 'Net amount in GBP (excluding VAT)' },
          vat_amount: { type: 'number', description: 'VAT in GBP. Defaults to amount * 0.20 if omitted.' },
          description: { type: 'string', description: 'e.g. "30% deposit", "January progress claim"' },
          invoice_number: { type: 'string', description: 'Invoice reference number (optional)' },
          issue_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
          due_date: { type: 'string', description: 'YYYY-MM-DD (optional)' },
          status: {
            type: 'string',
            enum: ['draft', 'sent', 'paid'],
            description: 'Defaults to sent',
          },
          paid_date: { type: 'string', description: 'YYYY-MM-DD if already paid (optional)' },
        },
        required: ['project_id', 'type', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_invoice_paid',
      description: 'Mark an existing invoice as paid',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: { type: 'string', description: 'UUID of the invoice to mark as paid' },
          paid_date: { type: 'string', description: 'Date payment was received YYYY-MM-DD, defaults to today' },
        },
        required: ['invoice_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_subcontractor_payment',
      description: 'Log a payment made to a subcontractor',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'UUID of the project' },
          subcontractor_name: { type: 'string', description: 'e.g. "ABC Plumbing", "Dave Electricals"' },
          amount: { type: 'number', description: 'Amount paid in GBP' },
          description: { type: 'string', description: 'What the work/payment was for' },
          payment_date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
          status: { type: 'string', enum: ['pending', 'paid'], description: 'Defaults to paid' },
        },
        required: ['project_id', 'subcontractor_name', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_detail',
      description: 'Get all invoices and subcontractor payments for a project to answer questions',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
        },
        required: ['project_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_outstanding_invoices',
      description: 'List all invoices that have not been paid yet (status is sent or overdue)',
      parameters: { type: 'object', properties: {} },
    },
  },
]

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history } = await req.json()
  const db = createAdminClient()

  // Load project list for context so the AI knows current project IDs
  const { data: projects } = await db
    .from('cf_projects')
    .select('id, name, client_name, contract_value, status')
    .order('created_at', { ascending: false })

  type ProjectRow = { id: string; name: string; client_name: string; contract_value: number; status: string }
  const projectContext = (projects || []).length > 0
    ? (projects as ProjectRow[]).map(p =>
        `• ${p.name} — ${p.client_name}, £${Number(p.contract_value).toLocaleString('en-GB')}, ${p.status} [ID: ${p.id}]`
      ).join('\n')
    : 'No projects yet.'

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const systemPrompt = `You are a construction finance assistant for a UK construction company run by Eli and Akiva. Today is ${today}.

Your job is to log financial transactions and answer questions. You track:
- Client invoices (we invoice clients — money coming in)
- Subcontractor payments (we pay subcontractors — money going out)

Typical workflow: new project starts → invoice 30% deposit → monthly progress invoices → pay subcontractors each month → final invoice on completion.

Current projects:
${projectContext}

Rules:
- All amounts are in GBP (£). VAT is 20% unless stated otherwise.
- When a user says "invoiced X for £Y" → create_invoice (type=monthly or deposit depending on context)
- When a user says "paid X £Y" → create_subcontractor_payment
- When a user says "received payment" or "client paid" → mark_invoice_paid
- Always confirm what you've done with a brief, friendly summary.
- If unclear which project, ask for clarification before acting.
- If a project doesn't exist yet, offer to create it.`

  const messages: MessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(history as MessageParam[] || []),
    { role: 'user', content: message },
  ]

  const actions: string[] = []

  // Agent loop
  let response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools: TOOLS,
    tool_choice: 'auto',
  })

  let assistantMsg = response.choices[0].message

  while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    messages.push(assistantMsg)
    const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = []

    for (const call of assistantMsg.tool_calls) {
      const args = JSON.parse(call.function.arguments)
      let result: string

      switch (call.function.name) {
        case 'create_project': {
          const { data, error } = await db.from('cf_projects').insert({
            name: args.name,
            client_name: args.client_name,
            client_contact: args.client_contact || null,
            contract_value: args.contract_value,
            start_date: args.start_date || null,
          }).select().single()
          if (error) { result = `Error: ${error.message}`; break }
          result = `Project created: "${data.name}" (ID: ${data.id})`
          actions.push(`Created project: ${data.name}`)
          break
        }

        case 'create_invoice': {
          const net = Number(args.amount)
          const vat = args.vat_amount != null ? Number(args.vat_amount) : Math.round(net * 0.2 * 100) / 100
          const todayIso = new Date().toISOString().split('T')[0]
          const { data, error } = await db.from('cf_invoices').insert({
            project_id: args.project_id,
            invoice_number: args.invoice_number || null,
            type: args.type,
            description: args.description || '',
            amount: net,
            vat_amount: vat,
            issue_date: args.issue_date || todayIso,
            due_date: args.due_date || null,
            paid_date: args.paid_date || null,
            status: args.status || (args.paid_date ? 'paid' : 'sent'),
          }).select().single()
          if (error) { result = `Error: ${error.message}`; break }
          result = `Invoice created: £${net.toLocaleString('en-GB')} + £${vat.toLocaleString('en-GB')} VAT (${args.type}), ID: ${data.id}`
          actions.push(`Logged ${args.type} invoice: £${net.toLocaleString('en-GB')} + VAT`)
          break
        }

        case 'mark_invoice_paid': {
          const todayIso = new Date().toISOString().split('T')[0]
          const { data, error } = await db.from('cf_invoices')
            .update({ status: 'paid', paid_date: args.paid_date || todayIso })
            .eq('id', args.invoice_id)
            .select().single()
          if (error) { result = `Error: ${error.message}`; break }
          result = `Invoice ${data.id} marked as paid on ${data.paid_date}`
          actions.push(`Invoice marked as paid`)
          break
        }

        case 'create_subcontractor_payment': {
          const todayIso = new Date().toISOString().split('T')[0]
          const { data, error } = await db.from('cf_subcontractor_payments').insert({
            project_id: args.project_id,
            subcontractor_name: args.subcontractor_name,
            description: args.description || '',
            amount: args.amount,
            payment_date: args.payment_date || todayIso,
            status: args.status || 'paid',
          }).select().single()
          if (error) { result = `Error: ${error.message}`; break }
          result = `Payment logged: ${args.subcontractor_name} £${Number(args.amount).toLocaleString('en-GB')}, ID: ${data.id}`
          actions.push(`Logged payment to ${args.subcontractor_name}: £${Number(args.amount).toLocaleString('en-GB')}`)
          break
        }

        case 'get_project_detail': {
          const { data, error } = await db.from('cf_projects')
            .select(`*, cf_invoices(*), cf_subcontractor_payments(*)`)
            .eq('id', args.project_id).single()
          result = error ? `Error: ${error.message}` : JSON.stringify(data)
          break
        }

        case 'get_outstanding_invoices': {
          const { data, error } = await db.from('cf_invoices')
            .select('*, cf_projects(name, client_name)')
            .in('status', ['sent', 'overdue'])
            .order('issue_date', { ascending: true })
          result = error ? `Error: ${error.message}` : JSON.stringify(data)
          break
        }

        default:
          result = 'Unknown tool'
      }

      toolResults.push({ role: 'tool', tool_call_id: call.id, content: result })
    }

    messages.push(...toolResults)

    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    })
    assistantMsg = response.choices[0].message
  }

  return NextResponse.json({
    reply: assistantMsg.content || 'Done.',
    actions,
    // Return updated assistant message for history
    assistantMessage: { role: 'assistant', content: assistantMsg.content },
  })
}
