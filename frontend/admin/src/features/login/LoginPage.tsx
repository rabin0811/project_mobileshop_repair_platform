import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SHOP_NAME } from '@mobileshop/shared';
import { Button, Card, Input } from '@mobileshop/ui';
import { ApiClientError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-ink">{SHOP_NAME} — Admin</h1>
            <p className="mt-1 text-sm text-ink-muted">Sign in to manage your repair shop</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="login-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
