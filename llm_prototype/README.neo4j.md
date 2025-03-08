# SELinux Policy Analysis with Neo4j

This provides a graph-based representation of SELinux policies using Neo4j.

## Setup

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the `llm_prototype` directory with the following content:
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=selinux123
```

3. Build and start the Neo4j container:

```bash
# using Docker
docker build -t selinux-neo4j .
docker run -d \
    --name selinux-neo4j \
    -p 7474:7474 \
    -p 7473:7473 \
    -p 7687:7687 \
    selinux-neo4j

# Or using Podman (recommended on Red Hat/CentOS/Fedora)
podman build -t selinux-neo4j .
podman run -d \
    --name selinux-neo4j \
    -p 7474:7474 \
    -p 7473:7473 \
    -p 7687:7687 \
    selinux-neo4j
```

4. Wait for Neo4j to start (about 30 seconds)

5. Initialize the database with sample data:


```bash
python sample_data.py
```

## Usage

### Connection Utilities

The `neo4j_utils.py` module provides a `Neo4jConnection` class for interacting with the database:

```python
from neo4j_utils import Neo4jConnection

# create a connection
conn = Neo4jConnection()

# execute a query
results = conn.execute_query("MATCH (n) RETURN count(n) as count")
print(results[0]['count'])

# close the connection
conn.close()
```

### Schema

- Node types (Subject, Object, Class)
- Relationship types (ALLOWS, TRANSITIONS, HAS_CLASS)
- Constraints and indexes
- Example queries

### Sample Data

The `sample_data.py` script provides example data for:

- SELinux subjects (processes)
- Objects (files, directories)
- Classes (permission sets)
- Allow rules and relationships

## Query Examples

1. Find all permissions for a subject:

```python
query = """
MATCH (s:Subject {name: $subject_name})-[:ALLOWS]->(o:Object)
RETURN s.name, o.name, o.class
"""
results = conn.execute_query(query, {"subject_name": "httpd_t"})
```

2. Find domain transitions:

```python
query = """
MATCH (s1:Subject)-[t:TRANSITIONS]->(s2:Subject)
RETURN s1.name, s2.name, t.target_domain
"""
results = conn.execute_query(query)
```

3. Find objects accessible by a subject:

```python
query = """
MATCH (s:Subject {name: $subject_name})-[:ALLOWS]->(o:Object)-[:HAS_CLASS]->(c:Class)
RETURN o.name, c.name, c.permissions
"""
results = conn.execute_query(query, {"subject_name": "httpd_t"})
```

## Cleanup

To stop and remove the Neo4j container:

```bash

# using Docker
docker stop selinux-neo4j
docker rm selinux-neo4j

# or using Podman

podman stop selinux-neo4j
podman rm selinux-neo4j
``` 