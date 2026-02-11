export const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const issues = result.error.issues ?? [];
            res.status(400).json({
                message: 'Validation error',
                errors: issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
            });
            return;
        }
        req.body = result.data;
        next();
    };
};
