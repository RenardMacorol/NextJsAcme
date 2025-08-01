import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import z from 'zod';
import { User } from './app/lib/definitions';
import bycrpt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function getUser(email: string): Promise<User | undefined> {
	try {
		const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
		return user[0];
	} catch (error) {
		console.error('Failed fetch error', error);
		throw new Error('Failed Fetch user');
	}
}

export const { auth, signIn, signOut } = NextAuth({
	...authConfig,
	providers: [
		Credentials({
			async authorize(credentials) {
				const parsedCredentials = z
					.object({ email: z.string().email(), password: z.string().min(6) })
					.safeParse(credentials);
				if (parsedCredentials.success) {
					const { email, password } = parsedCredentials.data;
					const user = await getUser(email);
					if (!user) return null;
					const passwordMatch = await bycrpt.compare(password, user.password);
					if (passwordMatch) return user;
				}
				console.log('Invalid Credentials');
				return null;
			},
		}),
	],
});
