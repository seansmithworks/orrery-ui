import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const hit = "min-h-[var(--hit-target-min)]";

export default function CrewCard() {
  return (
    <main className="flex min-h-screen items-start justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Ada Okafor</CardTitle>
          <CardDescription>Flight engineer, Orbit 7</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="h-auto w-full border">
              {["overview", "passes", "history"].map((v) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className={`${hit} h-auto capitalize data-[state=active]:border-border`}
                >
                  {v}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" className="pt-2 text-sm">
              Leads the docking checklist.
            </TabsContent>
            <TabsContent value="passes" className="pt-2 text-sm">
              Next close pass in four days.
            </TabsContent>
            <TabsContent value="history" className="pt-2 text-sm">
              Charted since March.
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <Button variant="ghost" className={hit}>
            Remove from crew
          </Button>
          <Button className={hit}>Save changes</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
