const express = require('express')
const { Pool } = require('pg')

const app = express()
const port = 3000

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'youruser',
  host: 'localhost',
  database: 'tododb',
  password: 'yourpassword',
  port: 5432,
})

app.use(express.json())

// Get all todos
app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT todos.*, ARRAY_AGG(tags.name) as tags FROM todos
      LEFT JOIN todo_tags ON todos.id = todo_tags.todo_id
      LEFT JOIN tags ON todo_tags.tag_id = tags.id
      GROUP BY todos.id;
      `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get a specific todo
app.get('/todos/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query('SELECT * FROM todos WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new todo
app.post('/todos', async (req, res) => {
  const { title, description } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update a todo
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params
  const { title, description, completed } = req.body
  try {
    const result = await pool.query(
      'UPDATE todos SET title = $1, description = $2, completed = $3 WHERE id = $4 RETURNING *',
      [title, description, completed, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete a todo
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 RETURNING *',
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' })
    }
    res.json({ message: 'Todo deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all tags
app.get('/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new tag
app.post('/tags', async (req, res) => {
  const { name } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO tags (name) VALUES ($1) RETURNING *',
      [name]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete a tag
app.delete('/tags/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 RETURNING *',
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    res.json({ message: 'Tag deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add a tag to a todo
app.post('/todos/:todoId/tags/:tagId', async (req, res) => {
  const { todoId, tagId } = req.params
  try {
    await pool.query(
      'INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)',
      [todoId, tagId]
    )
    res.status(201).json({ message: 'Tag added to todo successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove a tag from a todo
app.delete('/todos/:todoId/tags/:tagId', async (req, res) => {
  const { todoId, tagId } = req.params
  try {
    const result = await pool.query(
      'DELETE FROM todo_tags WHERE todo_id = $1 AND tag_id = $2',
      [todoId, tagId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo-tag association not found' })
    }
    res.json({ message: 'Tag removed from todo successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all tags for a specific todo
app.get('/todos/:todoId/tags', async (req, res) => {
  const { todoId } = req.params
  try {
    const result = await pool.query(
      'SELECT tags.* FROM tags JOIN todo_tags ON tags.id = todo_tags.tag_id WHERE todo_tags.todo_id = $1',
      [todoId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/populate-dummy-data', async (req, res) => {
  try {
    // Clear existing data
    await pool.query('TRUNCATE todos, tags, todo_tags RESTART IDENTITY CASCADE')

    // Insert dummy todos
    const todosResult = await pool.query(`
      INSERT INTO todos (title, description, completed) VALUES
      ('Buy groceries', 'Milk, eggs, bread', false),
      ('Finish project', 'Complete the report by Friday', false),
      ('Call mom', 'Catch up and plan visit', true),
      ('Exercise', 'Go for a 30-minute run', false),
      ('Read book', 'Finish chapter 5 of "The Great Gatsby"', false)
      RETURNING *
    `)

    // Insert dummy tags
    const tagsResult = await pool.query(`
      INSERT INTO tags (name) VALUES
      ('personal'),
      ('work'),
      ('health'),
      ('urgent'),
      ('leisure')
      RETURNING *
    `)

    // Associate tags with todos
    await pool.query(`
      INSERT INTO todo_tags (todo_id, tag_id) VALUES
      (1, 1), (1, 4), -- Buy groceries: personal, urgent
      (2, 2), (2, 4), -- Finish project: work, urgent
      (3, 1),         -- Call mom: personal
      (4, 3),         -- Exercise: health
      (5, 1), (5, 5)  -- Read book: personal, leisure
    `)

    res.json({
      message: 'Dummy data populated successfully',
      todos: todosResult.rows,
      tags: tagsResult.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
