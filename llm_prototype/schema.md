## Node Types

### Subject
- Label: `Subject`
- Properties:
  - `name`: Unique identifier for the subject
  - `type`: Type of subject (e.g., "process", "user", "role")
  - `domain`: SELinux domain
  - `attributes`: List of attributes

### Object
- Label: `Object`
- Properties:
  - `name`: Unique identifier for the object
  - `type`: Type of object (e.g., "file", "directory", "socket")
  - `class`: Object class
  - `attributes`: List of attributes

### Class
- Label: `Class`
- Properties:
  - `name`: Unique identifier for the class
  - `permissions`: List of available permissions
  - `description`: Description of the class

## Relationship Types

### ALLOWS
- Type: `ALLOWS`
- Properties:
  - `permissions`: List of allowed permissions
  - `conditions`: List of conditions for the rule
- Connects: `Subject` -> `Object`

### TRANSITIONS
- Type: `TRANSITIONS`
- Properties:
  - `target_domain`: Target SELinux domain
  - `conditions`: List of conditions for the transition
- Connects: `Subject` -> `Subject`

### HAS_CLASS
- Type: `HAS_CLASS`
- Properties:
  - `is_default`: Boolean indicating if this is the default class
- Connects: `Object` -> `Class`

## Constraints and Indexes

### Constraints
- `subject_name`: Unique constraint on Subject.name
- `object_name`: Unique constraint on Object.name
- `class_name`: Unique constraint on Class.name

### Indexes
- `subject_type`: Index on Subject.type
- `object_type`: Index on Object.type
- `class_type`: Index on Class.type

## Example Queries

### Find all allowed permissions for a subject
```cypher
MATCH (s:Subject {name: $subject_name})-[:ALLOWS]->(o:Object)
RETURN s.name, o.name, o.class
```

### Find domain transitions
```cypher
MATCH (s1:Subject)-[t:TRANSITIONS]->(s2:Subject)
RETURN s1.name, s2.name, t.target_domain
```

### Find objects accessible by a subject
```cypher
MATCH (s:Subject {name: $subject_name})-[:ALLOWS]->(o:Object)-[:HAS_CLASS]->(c:Class)
RETURN o.name, c.name, c.permissions
``` 