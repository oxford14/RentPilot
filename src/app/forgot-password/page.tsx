// This page has been removed.
// Users are redirected to the login page.
import { redirect } from 'next/navigation';

export default function ForgotPasswordPage() {
  redirect('/login');
  return null;
}
