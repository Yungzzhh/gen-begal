import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const chatUrl = 'https://api.gptapi.us/v1/chat/completions'

  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json()
    throw createError({
      statusCode: response.status,
      statusMessage: error.error?.message || 'An error occurred while fetching the API'
    })
  }

  return await response.json()
})