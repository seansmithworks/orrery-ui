import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const tabs = [
  { value: "overview", label: "Overview", text: "Leads the docking checklist." },
  { value: "passes", label: "Passes", text: "Next close pass in four days." },
  { value: "history", label: "History", text: "Charted since March." },
];

export default function CrewCard() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-start justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl leading-tight font-semibold">Ada Okafor</h1>
          </CardTitle>
          <CardDescription>Flight engineer, Orbit 7</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="grid h-auto min-h-[var(--hit-target-min)] w-full grid-cols-3">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="data-[state=active]:border-border min-h-[calc(var(--hit-target-min)-6px)]"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="pt-2 text-sm">
                {t.text}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2">
          <Button variant="ghost" className="min-h-[var(--hit-target-min)]">
            Remove from crew
          </Button>
          <Button className="min-h-[var(--hit-target-min)]">Save changes</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
