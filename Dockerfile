FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy TypeScript files
COPY fetch_image_gcp.ts tsconfig.json ./

# Install tsx globally
RUN npm install -g tsx

# Run the script
CMD ["tsx", "fetch_image_gcp.ts"]
