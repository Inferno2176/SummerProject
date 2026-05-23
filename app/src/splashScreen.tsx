import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import logo from "./assets/logo.png";

const tagline = "Local career AI assistant";

export default function SplashScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.stage}>
        <motion.div
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={styles.glow}
        />

        <motion.img
          src={logo}
          alt="logo"
          initial={{
            scale: 0,
            opacity: 0.5,
            rotate: 0,
          }}
          animate={{
            scale: [0, 0.5, 0],
            opacity: [0.5, 1, 0.5],
            rotate: 0,
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={styles.logo}
        />
      </div>

      <motion.div
        initial={{ width: 0, opacity: 0.5 }}
        animate={{ width: "42vw", opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={styles.line}
      />

      <div style={styles.tagline}>
        {tagline.split("").map((char, idx) => (
          <motion.span
            key={`${char}-${idx}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + idx * 0.035, duration: 0.2 }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </div>

    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100vw",
    height: "100vh",
    background: "#070709",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    flexDirection: "column",
    gap: "14px",
  },
  stage: {
    width: "50vw",
    height: "50vh",
    minWidth: "320px",
    minHeight: "260px",
    maxWidth: "780px",
    maxHeight: "520px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logo: {
    width: "140px",
    zIndex: 2,
    filter: `
      drop-shadow(0 0 10px rgba(255,122,26,0.6))
      drop-shadow(0 0 25px rgba(255,122,26,0.4))
    `,
  },
  glow: {
    position: "absolute",
    width: "460px",
    height: "460px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,122,26,0.85) 0%, rgba(255,122,26,0.10) 65%, rgba(255,122,26,0.02) 100%)",
    filter: "blur(28px)",
  },
  line: {
    height: "1px",
    background: "linear-gradient(to right, rgba(255,122,26,0.15), rgba(255,122,26,0.9), rgba(255,122,26,0.15))",
  },
  tagline: {
    color: "rgba(255,255,255,0.92)",
    fontSize: "14px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
  },
};
