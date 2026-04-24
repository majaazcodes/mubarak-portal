import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Groups — Mubarak Travels",
};

export default function GroupsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
        <p className="text-muted-foreground">
          Organize pilgrims into travel groups.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Group management UI ships in the next prompt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Backend ready at <code>/api/v1/groups</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
