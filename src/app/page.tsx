import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <Badge>flobase</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to flobase</h1>
          <p className="text-muted-foreground">Starter powered by Next.js, Tailwind and shadcn/ui with Supabase Auth.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Quick demo</CardTitle>
            <CardDescription>Basic components wired up with authentication.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Input placeholder="Type something..." className="sm:max-w-xs" />
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button asChild>
              <Link href="/auth/signin">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
