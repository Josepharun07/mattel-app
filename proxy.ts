import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/",
  publicRoutes: ["/", "/reset-password"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
