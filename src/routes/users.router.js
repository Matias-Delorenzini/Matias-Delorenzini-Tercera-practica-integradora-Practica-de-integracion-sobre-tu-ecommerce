import express from 'express';
import { publicRouteAuth } from './middlewares/publicRouteAuth.middleware.js';
import { usersService } from '../repositories/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get("/premium/:uid", publicRouteAuth, async (req, res) => {
    logger.debug("ENDPOINT USERS ALCANZADO")
    try {
        const email = req.params.uid;
        const user = await usersService.findUserByEmail(email)

        if (user.role === "user") {
            const result = await usersService.updateUserRole(email,"premium")
            req.session.user.role = "premium"
            logger.debug(req.session.user.role)

            return res.send("Role cambiado a premium")
        };
        if (user.role === "premium") {
            const result = await usersService.updateUserRole(email,"user")
            req.session.user.role = "user"
            logger.debug(req.session.user.role)

            return res.send("Role cambiado a user")
        };
    } catch (error) {
        logger.error("Error en /register endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;