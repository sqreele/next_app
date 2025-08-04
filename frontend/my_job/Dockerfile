FROM node:20-alpine

WORKDIR /app

# Set environment variables to prevent external domain usage
ENV NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_SOCKET_URL=ws://localhost:3001
ENV NEXT_PUBLIC_USE_EXTERNAL_API=false
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
