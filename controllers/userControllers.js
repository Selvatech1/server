const jwt = require('jsonwebtoken');
const User = require('../models/userSchema'); // Ensure the path is correct
const UserOtp = require('../models/userOtp');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

// User registration
exports.userregister = async (req, res) => {
    const { fname, email, password } = req.body;

    if (!fname || !email || !password) {
        return res.status(400).json({ error: "Please enter all input data" });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ error: "This user already exists in our database" });
        } else {
            const newUser = new User({
                fname, email, password
                // Ensure you handle password hashing here
            });

            const savedUser = await newUser.save();
            res.status(200).json(savedUser);
        }
    } catch (error) {
        res.status(400).json({ error: "Invalid details", error });
    }
};

// Send OTP
exports.userOtpSend = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Please enter your email" });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            const OTP = Math.floor(100000 + Math.random() * 900000);

            let otpRecord = await UserOtp.findOne({ email });

            if (otpRecord) {
                otpRecord.otp = OTP;
                await otpRecord.save();
            } else {
                otpRecord = new UserOtp({ email, otp: OTP });
                await otpRecord.save();
            }

            const mailOptions = {
                from: process.env.EMAIL,
                to: email,
                subject: "OTP Validation",
                text: `Your OTP is: ${OTP}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error sending email:", error);
                    return res.status(400).json({ error: "Email not sent" });
                } else {
                    console.log("Email sent:", info.response);
                    return res.status(200).json({ message: "Email sent successfully" });
                }
            });
        } else {
            return res.status(400).json({ error: "This user does not exist in our database" });
        }
    } catch (error) {
        res.status(400).json({ error: "Invalid details", error });
    }
};

// Get user data
exports.getUserData = async (req, res) => {
    try {
       // const token = req.headers.authorization.split(" ")[1];
       // const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET is set in your environment variables
        const user = await User.find(); // Fetch user data excluding the password
        res.status(200).json(user);
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
};

// User login
exports.userLogin = async (req, res) => {
    const { email, otp } = req.body;

    if (!otp || !email) {
        return res.status(400).json({ error: "Please enter your OTP and email" });
    }

    try {
        const otpRecord = await UserOtp.findOne({ email });

        if (otpRecord && otpRecord.otp === otp) {
            const user = await User.findOne({ email });

            if (user) {
                // Generate token - Ensure you have a method to generate the auth token
                const token = await user.generateAuthToken();
                return res.status(200).json({ message: "User login successful", userToken: token });
            } else {
                return res.status(400).json({ error: "User not found" });
            }
        } else {
            return res.status(400).json({ error: "Invalid OTP" });
        }
    } catch (error) {
        res.status(400).json({ error: "Invalid details", error });
    }
};
