import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Pilgrims — Mubarak Travels",
};

export default function PilgrimsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pilgrims</h1>
        <p className="text-muted-foreground">
          Manage your pilgrim roster — list, search, import.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Pilgrim list + search + bulk import land in the next prompt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The backend already serves <code>GET /api/v1/pilgrims</code> with
            paginated search via the GIN index. This page will wire up to it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
