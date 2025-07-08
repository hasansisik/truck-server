require("dotenv").config();
require("express-async-errors");
//express
const cors = require("cors");
const express = require("express");
const app = express();


// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow any origin that matches your IP address with any port
    if (!origin || origin.startsWith('http://192.168.1.58:') || origin === 'http://localhost:3000' || origin === 'https://truck-nextjs-seven.vercel.app') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// rest of the packages
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

//database
const connectDB = require("./config/connectDB");

//routers
const authRouter = require("./routers/auth");
const towRouter = require("./routers/tow");
const vehicleRouter = require("./routers/vehicle");
const driverRouter = require("./routers/driver");
const companyRouter = require("./routers/company");
const expenseRouter = require("./routers/expense");

//midlleware
const notFoundMiddleware = require("./middleware/not-found");
const erorHandlerMiddleware = require("./middleware/eror-handler");

//app
app.use(morgan("tiny"));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET_KEY));

app.use(express.urlencoded({ extended: true }));

app.use("/v1/auth", authRouter);
app.use("/v1/tow", towRouter);
app.use("/v1/vehicles", vehicleRouter);
app.use("/v1/drivers", driverRouter);
app.use("/v1/companies", companyRouter);
app.use("/v1/expenses", expenseRouter);

app.use(notFoundMiddleware);
app.use(erorHandlerMiddleware);

const port = process.env.PORT || 3040;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);


    app.listen(
      port,
      console.log(
        `MongoDb Connection Successful,App started on port ${port} : ${process.env.NODE_ENV}`
      )
    );
  } catch (error) {
    console.log(error);
  }
};

start();
