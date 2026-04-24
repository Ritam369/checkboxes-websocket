import redis from "./redis.js"

const KEY = process.env.KEY

export const getState = async () => {
  const members = await redis.smembers(KEY) //Because Redis stores this data as a "Set" (a collection of unique values), it instantly returns an array of all the indices that are currently checked
  return members.map(Number)
}

export const setState = async (index, checkedFlag) => {
  //add the index to the Redis Set if the checkbox is checked. (If the user unchecked the box, it would use redis.srem to remove it).
  if (checkedFlag) {
    await redis.sadd(KEY, index)
  } else {
    await redis.srem(KEY, index)
  }
}

export const hasState = async (index) => {
  return Boolean(await redis.sismember(KEY, index))
  //sismember is the "Set Is Member" command. It asks Redis: "Does this specific index exist inside the Set?" * Redis responds with 1 if it exists, and 0 if it doesn't.
}
