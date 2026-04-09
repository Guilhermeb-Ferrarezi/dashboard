import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Skeleton className="h-12 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="gap-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
