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

export default function Page() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle role="heading" aria-level={1} className="text-lg">
            Ada Okafor
          </CardTitle>
          <CardDescription>Flight engineer, Orbit 7</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="passes">Passes</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm">
              Leads the docking checklist.
            </TabsContent>
            <TabsContent value="passes" className="text-sm">
              Next close pass in four days.
            </TabsContent>
            <TabsContent value="history" className="text-sm">
              Charted since March.
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Button variant="ghost">Remove from crew</Button>
          <Button>Save changes</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
