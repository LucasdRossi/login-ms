const express = require("express");
const Auth = require("../database");

const { checkBody, requireAuth } = require("./middlewares");
const { RequestError } = require("../helpers");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const auth = new Auth();
  try {
    checkBody(req.body, ["username", "password", "confirmation"]);

    let { username, password, confirmation } = req.body;
    username = username[0].toUpperCase() + username.substring(1);

    if (password !== confirmation) {
      throw new RequestError(400, "Passwords must match");
    }

    await auth.connect();

    const exist = await auth.getByAttrs({ username });

    if (exist) {
      throw new RequestError(400, `Username ${username} is already registered`);
    }

    await auth.create({ username, password });
    console.log(`=> LOG: ${username} registered`);

    return res.status(201).json({ success: `${username} is now registered` });
  } catch (error) {
    console.log(`=> ERROR: ${error.message}`);
    if (error instanceof RequestError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    await auth.disconnet();
  }
});

router.get("/login", async (req, res) => {
  const auth = new Auth();
  try {
    if (req.session.userId) {
      throw new RequestError(400, `User is already logged in`);
    }

    checkBody(req.body, ["username", "attempt"]);

    let { username, attempt } = req.body;
    username = username[0].toUpperCase() + username.substring(1);

    await auth.connect();

    const user = await auth.getByAttrs({ username });

    if (!user) {
      throw new RequestError(404, `Username ${username} is not registered`);
    }

    const correct = auth.comparePassword(attempt, user.password);

    if (!correct) {
      throw new RequestError(400, `Incorrect password`);
    }

    req.session.userId = user.id;
    return res.status(200).json({ success: `Correct password` });
  } catch (error) {
    console.log(`=> ERROR: ${error.message}`);
    if (error instanceof RequestError) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    await auth.disconnet();
  }
});

router.get("/logout", requireAuth, (req, res) => {
  res.status(200).json({ success: "Logged out" });
});

module.exports = router;
