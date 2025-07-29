import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
	pages: {
		signIn: '/login',
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isOnDasboard = nextUrl.pathname.startsWith('/dashboard');
			if (isOnDasboard) {
				if (isLoggedIn) {
					return true;
				} else
					return false;
			} else if (isLoggedIn) {
				return Response.redirect(new URL('/dashboard', nextUrl))
			}
			return true;
		},


	},
	providers: [],


} satisfies NextAuthConfig;
