import { createRequire } from "module"
const require = createRequire(import.meta.url)
const { withWorkflow } = require("workflow/next")

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withWorkflow(nextConfig)
