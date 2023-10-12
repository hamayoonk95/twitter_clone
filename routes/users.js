const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const authenticate = require("../middleware/authenticate");

router.get("/register", (req, res) => {
    res.render("users/register");
});

router.post("/registered", async (req, res) => {
    const { firstname, surname, email, username, password } = req.body;

    // validation checks
    if (!firstname || !surname || !email || !username || !password) {
        req.flash("error", "All fields are required");
        return res.redirect("/users/register");
    }

    if (password.length < 8) {
        req.flash("error", "Password should be at least 8 characters long");
        return res.redirect("/users/register");
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
        req.flash("error", "Username or Email already exists");
        return res.redirect("/users/register");
    }

    try {
        const user = new User({
            firstname,
            surname,
            email,
            username,
            password,
        });

        await user.save();
        req.flash("success", "Registered successfully. Please log in.");
        res.redirect("/users/login");
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/users/register");
    }
});

router.get("/login", (err, res) => {
    res.render("users/login");
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        req.flash("error", "Both username and password are required");
        return res.redirect("/users/login");
    }

    const user = await User.findOne({ username });

    if (!user) {
        req.flash("error", "Invalid username or password");
        return res.redirect("/users/login");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        req.flash("error", "Invalid username or password");
        return res.redirect("/users/login");
    }

    const token = jwt.sign(
        { id: user._id, username: user.username },
        "Secretkey",
        { expiresIn: "1h" }
    );

    req.flash("success", "User logged In successfully");
    res.cookie("authToken", token).redirect("/");
});

router.get("/profile", authenticate, async (req, res) => {
    try {
        // Fetch user's posts, followers, and followings
        const userPosts = await Post.find({ author: req.user.id }).sort(
            "-date"
        );
        const userFollowers = req.user.followers; // Assuming user's schema has followers field
        const userFollowings = req.user.following; // Assuming user's schema has following field

        res.render("users/profile", {
            posts: userPosts,
            followers: userFollowers,
            followings: userFollowings,
        });
    } catch (err) {
        console.error("Error fetching profile data:", err);
        req.flash("error", "Something went wrong");
        res.redirect("/");
    }
});

router.get("/logout", (req, res) => {
    req.flash("success", "Logged out Successfully");
    res.clearCookie("authToken").redirect("/");
});

module.exports = router;
