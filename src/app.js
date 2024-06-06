import express from "express";

import { engine } from 'express-handlebars';

import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import initializePassport from "./config/passport.config.js";
import config from "./config/config.js";

import { errorHandler } from './services/errors/errorHandler.js';
import { addLogger } from "./utils/logger.js";
import { logger } from "./utils/logger.js";

import cartsRouter from './routes/carts.router.js';
import mockingProductsRouter from './routes/mockingproducts.router.js';
import productsRouter from './routes/products.router.js';
import sessionsRouter from './routes/sessions.router.js';
import usersRouter from './routes/users.router.js';
import viewsRouter from './routes/views.router.js';

const app = express();

app.use(addLogger);

mongoose.connect(config.mongoUrl);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
    store: MongoStore.create({
        mongoUrl: config.mongoUrl,
        mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
    }),
    secret: "asd3ñc3okasod",
    resave: false,
    saveUninitialized: false
}));

initializePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/cart', cartsRouter);
app.use('/mockingproducts', mockingProductsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/users', usersRouter)
app.use('/', viewsRouter);

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get("/", (req, res) => {
    res.redirect(`http://localhost:${config.port}/login`);
});

app.get('/loggerTest', (req, res) => {
    req.logger.debug("Esto es un Debug");
    req.logger.http("Esto es un Http");
    req.logger.info("Esto es un Info");
    req.logger.warning("Esto es un Warning");
    req.logger.error("Esto es un Error");
    req.logger.fatal("Esto es un Fatal");
    res.send({message: "¡Prueba de logger!"});
})

app.use(errorHandler);

app.listen(config.port, () => logger.info(`Listening on PORT: ${config.port}`));