# To-Do App with MongoDB on Kubernetes

This guide walks through building a To-Do microservice using Node.js, MongoDB, Docker, and deploying it on Kubernetes.

---

## Prerequisites

- Docker
- Kubernetes (Docker Desktop)
- kubectl
- Node.js + npm
- Postman or curl
---

## 1.Application Code (index.js)

```js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 4000;

// MongoDB config from environment variables
const uri = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB_NAME;
let db;

app.use(express.json());

app.get('/health', (req, res) => res.send('OK'));

MongoClient.connect(uri)
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB');

    app.post('/todos', async (req, res) => {
      try {
        const result = await db.collection('todos').insertOne(req.body);
        res.status(201).json(result);
      } catch (err) {
        res.status(500).send('Create failed');
      }
    });

    app.get('/todos', async (req, res) => {
      try {
        const todos = await db.collection('todos').find().toArray();
        res.json(todos);
      } catch (err) {
        res.status(500).send('Read failed');
      }
    });

    app.listen(port, () => console.log(`To-Do API running at http://localhost:${port}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
```

---

## 2.Dockerfile

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]
```

---

## 3.Build and Push Docker Image

```bash
docker build -t todo-app .
```

---

## 4.mongo-secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongo-secret
type: Opaque
stringData:
  mongo-root-username: rootuser
  mongo-root-password: rootpass
```

---

## 5.mongo-pv-pvc.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongo-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/tmp/mongo-data"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

---

## 6.mongo-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
      - name: mongo
        image: mongo
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongo-secret
              key: mongo-root-username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongo-secret
              key: mongo-root-password
        volumeMounts:
        - name: mongo-storage
          mountPath: /data/db
      volumes:
      - name: mongo-storage
        persistentVolumeClaim:
          claimName: mongo-pvc
```

---

## 7.todo-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: todo
  template:
    metadata:
      labels:
        app: todo
    spec:
      containers:
      - name: todo-app
        image: todo-app
        ports:
        - containerPort: 4000
        env:
        - name: MONGO_URL
          value: mongodb://$(MONGO_USER):$(rootpass)@mongo:27017
        - name: MONGO_DB_NAME
          value: todo_db
```

---

## 8.todo-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-service
spec:
  type: NodePort
  selector:
    app: todo
  ports:
    - port: 4000
      targetPort: 4000
      nodePort: 31000
```

---

## Deploy Everything

```bash
kubectl apply -f mongo-secret.yaml
kubectl apply -f mongo-pv-pvc.yaml
kubectl apply -f mongo-deployment.yaml
kubectl apply -f todo-deployment.yaml
kubectl apply -f todo-service.yaml
```

---

## Test the API with CRUD 

### Create a To-Do (POST)

**Endpoint:**  
`POST http://localhost:31000/todos`

**Headers:**  
`Content-Type: application/json`

**Body:**
```json
{
  "title": "Finish assignment",
  "description": "Complete SIT737 Task 9.1P",
  "status": "pending"
}
```

**Response:**  
HTTP 201 Created with inserted object info

---

### Get All To-Dos (GET)

**Endpoint:**  
`GET http://localhost:31000/todos`

**Response:**  
```json
[
  {
    "_id": "mongo_object_id",
    "title": "Finish assignment",
    "description": "Complete SIT737 Task 9.1P",
    "status": "pending"
  }
]
```

---

### Get a To-Do by ID (GET)

**Endpoint:**  
`GET http://localhost:31000/todos/<id>`

Replace `<id>` with the Mongo `_id` of the document.

---

### Update a To-Do by ID (PUT)

**Endpoint:**  
`PUT http://localhost:31000/todos/<id>`

**Headers:**  
`Content-Type: application/json`

**Body:**
```json
{
  "status": "done"
}
```

---

### Delete a To-Do by ID (DELETE)

**Endpoint:**  
`DELETE http://localhost:31000/todos/<id>`

**Response:**  
HTTP 200 with deletion status

---

## Finally !

MongoDB and To-Do API are successfully running in Kubernetes with Docker.
