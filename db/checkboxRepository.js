import redis from "./redis.js"

const KEY = process.env.KEY

export const getState = async () => {
  const members = await redis.smembers(KEY)
  return members.map(Number)
}

export const setState = async (index, checkedFlag) => {
  if (checkedFlag) {
    await redis.sadd(KEY, index)
  } else {
    await redis.srem(KEY, index)
  }
}

export const hasState = async (index) => {
  return Boolean(await redis.sismember(KEY, index))
}
