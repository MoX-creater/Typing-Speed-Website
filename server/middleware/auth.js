import jwt from "jsonwebtoken";

/**
 * JWT authentication middleware.
 * Extracts and verifies the token from the Authorization header.
 * Attaches decoded user payload to req.user on success.
 */
const auth = (req, res, next) => {
  try {
    const header = req.header("Authorization");
    if (!header) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : header;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default auth;
