import { neonAuthMiddleware } from "@neondatabase/neon-js/auth/next";

export default neonAuthMiddleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/bookmarks/:path*", "/my-routes/:path*"],
};
