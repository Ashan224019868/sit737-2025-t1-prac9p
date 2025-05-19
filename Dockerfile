# Use official Node.js LTS base image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the source code into the container
COPY . .

# Expose port 4000 (same as in index.js)
EXPOSE 4000

# Start the application
CMD ["node", "index.js"]
