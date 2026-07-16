import { Link } from "react-router-dom";
import { Button } from "../../components/common/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-4xl font-extrabold">404</h1>
      <p className="text-content-muted">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="mt-2">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
