
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-6">
      <Icons.Warning className="w-24 h-24 text-destructive mb-6" />
      <h1 className="text-5xl font-bold text-foreground mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-muted-foreground mb-4">Page Not Found</h2>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Oops! The page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Link href="/dashboard">
          <Icons.Dashboard className="mr-2 h-5 w-5" />
          Go to Dashboard
        </Link>
      </Button>
    </div>
  );
}
