import express from 'express';
import passport from 'passport';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { usersService } from './../repositories/index.js';
import { logger } from '../utils/logger.js';
import config from '../config/config.js';
import { isValidPassword, createHash } from '../utils/utils.js';
const router = express.Router();

const JWT_SECRET = 'jwt_password_secreto_coderhouse_1234';
const JWT_EXPIRATION = '1h';

var smtpConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'matiasdelorenc@gmail.com',
        pass: 'cbar ughw lyxd ocgw'
    }
};
var transporter = nodemailer.createTransport(smtpConfig);

router.get("/current", (req, res) => {
    try {
        if (req.session.user) {
            res.status(200).json({ user: req.session.user });
        } else {
            res.status(401).json({ error: "Unauthorized" });
        }
    } catch (error) {
        logger.error("Error en /current endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/register", passport.authenticate("register", { failureRedirect: "/api/sessions/failregister" }), async (req, res) => {
    try {
        res.redirect("/login");
    } catch (error) {
        logger.error("Error en /register endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get("/failregister", async (req, res) => {
    try {
        logger.info("Failed Strategy");
        res.redirect("/register");
    } catch (error) {
        logger.error("Error en /failregister endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/login", passport.authenticate("login", { failureRedirect: "/api/sessions/faillogin" }), async (req, res) => {
    try {
        if (!req.user) return res.status(400).send({ status: "error", error: "Invalid credentials" });

        req.session.user = await usersService.createUserSession(req.user);

        res.redirect("/api/products");
    } catch (error) {
        logger.error("Error en /login endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get("/faillogin", (req, res) => {
    try {
        res.redirect("/login");
    } catch (error) {
        logger.error("Error en /faillogin endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/logout", (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                logger.error("Error al hacer logout", err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.redirect("/login");
        });
    } catch (error) {
        logger.error("Error en /logout endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/recover', async (req, res) => {
    try {
        const email = req.body.email;
        logger.debug(`Email recibido: ${email}`);
        const user = await usersService.findUserByEmail(email);
        logger.debug(`Usuario encontrado: ${user.email}`);
        if (!user) {
            logger.info(`El email ${email} no está asociado a ninguna cuenta`);
            return res.redirect('/recover');
        }

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
        logger.debug(`TOKEN WHEN INSTANCED: ${token}`)
        const recoverUrl = `http://localhost:${config.port}/api/sessions/reset-password?token=${token}&email=${encodeURIComponent(email)}`;


        let result = await transporter.sendMail({
            from: 'Coder Tests matiasdelorenc@gmail.com',
            to: email,
            subject: `Solicitud de reestablecimiento de contraseña`,
            html: `
            <h2>¡Hola ${user.first_name}! recibimos una solicitud para cambiar tu contraseña</h2>
            <h3><a href=${recoverUrl}>Si fuiste tú, cambia tu contraseña</a></h3>
            <p>Si no fuiste tú quien envió la solicitud, alguien intentó reestablecer tu contraseña. Considera tener una contraseña segura y fuerte para evitar inconvenientes a futuro</p>
            `,
            attachments: []
        });


        res.send('Correo de recuperación enviado');
    } catch (error) {
        logger.error("Error en /recover endpoint", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/reset-password', (req, res) => {
    logger.debug("SE ACCEDIÓ AL GET reset-password")
    const token = req.query.token;
    const email = req.query.email;
    logger.debug(`TOKEN WHEN RECEIVED: ${token}`)
    logger.debug(`EMAIL WHEN RECEIVED: ${email}`)

    
    if (!token) {
        return res.status(400).send('Token is missing');
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(400).send(`
            <html>
                <body>
                    <p>El enlace ha expirado</p>
                    <a href="/recover">Enviar un nuevo enlace</a>
                </body>
            </html>
        `);        }

        res.render("reset-password", { token, email });
    });
});

router.post('/reset-password', async (req, res) => {
    const { token, newPassword, email } = req.body;
    logger.debug(`TOKEN WHEN RECEIVED LAST TIME: ${token}`)
    logger.debug(`EMAIL WHEN RECEIVED LAST TIME: ${email}`)
    logger.debug(`newPassword WHEN RECEIVED LAST TIME: ${newPassword}`)

    const recoverUrl = `http://localhost:${config.port}/api/sessions/reset-password?token=${token}&email=${encodeURIComponent(email)}`;


    if (!token || !newPassword) return res.status(400).send('Token or new password is missing');

    const user = await usersService.findUserByEmail(email);

    const newPasswordHashed = createHash(newPassword)

    if(isValidPassword(user, newPassword)) return res.redirect(`${recoverUrl}`)

    logger.debug(token)

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            logger.error(err)
            return res.status(400).send(`
            <html>
                <body>
                    <p>El enlace ha expirado</p>
                    <a href="/recover">Enviar un nuevo enlace</a>
                </body>
            </html>
        `);
        }

        const { email } = decoded;
        const user = await usersService.findUserByEmail(email);
        if (!user) {
            return res.status(400).send('User not found');
        }

        if (user.password === newPassword) {
            return res.status(400).send('La nueva contraseña no debe ser la misma que la anterior');
        }

        await usersService.updateUserPassword(email, newPasswordHashed);
        res.send('Contraseña actualizada correctamente. Puedes cerrar esta ventana');
    });
});

export default router;