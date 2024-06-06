export function authorize(roles) {
    return (req, res, next) => {
        const role = req.session.user.role
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}