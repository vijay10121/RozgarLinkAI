import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button
        aria-label="Log out of RozgarLink"
        className="gap-2"
        size="sm"
        type="submit"
        variant="outline"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Log out
      </Button>
    </form>
  );
}
