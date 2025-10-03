import { Button } from "@/components/ui/button";

export default function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-xl space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="pt-2">
          <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Continue to build this page</Button>
        </div>
      </div>
    </div>
  );
}
