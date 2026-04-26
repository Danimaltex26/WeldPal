// Role-checking middleware. Use after auth middleware.
// Usage: router.get("/dashboard", auth, requireRole("manager", "admin"), handler)

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
