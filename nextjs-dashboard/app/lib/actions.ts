'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { z } from 'zod'
import postgres from 'postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { error } from 'zod/v4/locales/en.js'


export async function authenticate(prevState: string | undefined, formData: FormData) {
	try {
		await signIn('credentials', formData)
	} catch (error) {
		if (error instanceof AuthError) {
			switch (error.type) {
				case 'CredentialsSignin':
					return 'Invald Credentials';
				default:
					return 'Something went wrong'
			}
		}
		throw error;
	}

}

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
	id: z.string(),
	customerId: z.string({ invalid_type_error: 'please select customer' }),
	amount: z.coerce.number().gt(0, { message: 'please inpute greater than 0' }),
	status: z.enum(['paid', 'pending'], { invalid_type_error: 'please select type' }),
	date: z.string(),
})

export type State = {
	errors?: {
		customerId?: string[];
		amount?: string[];
		status?: string[];
	}
	message?: string | null;
}

const CreateInvoice = FormSchema.omit({ date: true, id: true })


export async function createInvoice(prevState: State, formData: FormData) {
	const validateFields = CreateInvoice.safeParse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	});
	if (!validateFields.success) {
		return { errors: validateFields.error.flatten().fieldErrors, message: 'Missing fields' }
	}

	const { customerId, amount, status } = validateFields.data;
	const amountInCents = amount * 100;
	const date = new Date().toISOString().split('T')[0];

	try {
		await sql`INSERT INTO invoices (customer_id, amount, status, date)
	VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;


	} catch (err) { console.log('insert failed' + err) }

	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices')

}

const UpdateInvoice = FormSchema.omit({ date: true, id: true })

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
	const validateFields = UpdateInvoice.safeParse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	});
	if (!validateFields.success) {
		return { errors: validateFields.error.flatten().fieldErrors, message: 'Missing fields' }
	}

	const { customerId, amount, status } = validateFields.data;

	const amountInCents = amount * 100;

	try {
		await sql`UPDATE invoices SET customer_id = ${customerId}, amount = ${amountInCents}, status =${status} 
		WHERE id = ${id}`;
	} catch (err) {
		console.log("update failed " + err);
	}

	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices')

}


export async function deleteInvoice(id: string) {

	try {
		await sql`DELETE FROM invoices where id = ${id}`;
	} catch (err) { console.log("delete failed " + err) }
	revalidatePath('/dasboard/invoices');

}
