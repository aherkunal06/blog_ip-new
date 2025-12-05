import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { queryOne, execute } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

const validRoles = ['admin', 'super-admin'] as const;
type AdminRole = typeof validRoles[number];

export const authOptions: NextAuthOptions = {
  basePath: '/api/auth/admin',
  providers: [
    Credentials({
      name: 'Admin Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otpToken: { label: 'OTP Token', type: 'text' }, // For OTP login
      },
      async authorize(credentials): Promise<any> {
        console.log('Authorize called with credentials:', {
          hasUsername: !!credentials?.username,
          hasEmail: !!credentials?.email,
          hasPassword: !!credentials?.password,
          hasOtpToken: !!credentials?.otpToken,
          otpTokenValue: credentials?.otpToken ? credentials.otpToken.substring(0, 50) + '...' : null,
        });

        // Handle OTP-verified login (when otpToken has verified: true)
        // This means OTP was already verified via /api/auth/admin/otp-login
        if (credentials?.otpToken && credentials?.username) {
          try {
            console.log('Attempting OTP-verified login for username:', credentials.username);
            const tokenData = JSON.parse(credentials.otpToken);
            console.log('Parsed OTP token data:', tokenData);
            
            if (tokenData.verified && credentials.username) {
              // OTP was already verified, just return the admin user
              const admin = await queryOne<{
                id: number;
                username: string;
                email: string;
                status: string;
                isSuper: boolean;
                role: string;
              }>(
                'SELECT id, username, email, status, isSuper, role FROM AdminUser WHERE username = ?',
                [credentials.username]
              );

              console.log('Admin query result for OTP login:', admin ? { id: admin.id, username: admin.username, status: admin.status } : 'Not found');

              if (admin && admin.status === 'approved') {
                const user = {
                  id: admin.id.toString(),
                  name: admin.username,
                  email: admin.email,
                  role: admin.role || (admin.isSuper ? 'super-admin' : 'admin'),
                };
                console.log('OTP-verified login successful, returning user:', user);
                return user;
              } else {
                console.error('Admin not found or not approved for OTP login');
              }
            } else {
              console.error('OTP token data not verified or missing username');
            }
          } catch (error) {
            console.error('OTP-verified login error:', error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
          }
        }

        // Handle password login
        const loginIdentifier = credentials?.username || credentials?.email;
        if (!loginIdentifier || !credentials.password) return null;
        
        // Skip password check if it's an OTP token format
        if (credentials.password.startsWith('otp_')) {
          return null; // OTP login should use otpToken path above
        }

        // Try to find admin by username or email
        const admin = await queryOne<{
          id: number;
          username: string;
          email: string;
          password: string;
          status: string;
          isSuper: boolean;
          role: string;
        }>(
          'SELECT id, username, email, password, status, isSuper, role FROM AdminUser WHERE username = ? OR email = ?',
          [loginIdentifier, loginIdentifier]
        );

        if (
          admin &&
          await bcrypt.compare(credentials.password, admin.password) &&
          admin.status === 'approved'
        ) {
          // Use the role field if available, otherwise fall back to isSuper check
          const role = admin.role || (admin.isSuper ? 'super-admin' : 'admin');
          
          return {
            id: admin.id.toString(),
            name: admin.username,
            email: admin.email,
            role: role,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.role = user.role;
        if (user.email) {
          (token as any).email = user.email;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user && validRoles.includes(token.role as AdminRole)) {
        session.user.role = token.role as AdminRole;
        // Include email from token if available
        if ((token as any).email) {
          (session.user as any).email = (token as any).email;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30*60, 
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Add pages for custom error handling or login redirects
  pages: {
    signIn: '/auth/admin/login', // Redirect to your custom login page
    // error: '/auth/error', // Optional: Redirect to a custom error page
  },
  // Ensure cookies are set with the correct path
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

