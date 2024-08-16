// server/api/add-dishes-batch.ts

import { serverSupabaseClient } from '#supabase/server'
import { H3Event } from 'h3'

interface DishInput {
  name: string
  description: string
  imageUrl: string
  cookingMethod: string[]
  meatType: string[]
}

export default defineEventHandler(async (event: H3Event) => {
  const client: any = await serverSupabaseClient(event)

  const dishes: DishInput[] = await readBody(event)

  if (!Array.isArray(dishes) || dishes.length === 0) {
    return { success: false, error: 'Invalid input: dishes must be a non-empty array' }
  }

  const results: { success: boolean; dishId?: number; error?: string }[] = []

  try {
    // 批量插入菜品，包括 image_url
    const { data: dishesData, error: dishesError } = await client
      .from('dishes')
      .insert(dishes.map(dish => ({
        name: dish.name,
        description: dish.description,
        image_url: dish.imageUrl
      })))
      .select('id')

    if (dishesError) throw dishesError

    if (!dishesData || !Array.isArray(dishesData) || dishesData.length === 0) {
      throw new Error('No dishes were inserted')
    }

    // 准备烹饪方法和肉类类型的批量插入数据
    const cookingMethodsInserts: { dish_id: any; cooking_method_code: string }[] = []
    const meatTypesInserts: { dish_id: any; meat_type_code: string }[] = []
    console.log('Dishes data:', dishesData);
    console.log('Original dishes:', dishes);


    dishesData.forEach((dish, index) => {
      if (dish && dish.id) {
        const dishId = dish.id
        const originalDish = dishes[index]

        if (originalDish) {
          originalDish.cookingMethod.forEach(method => {
            console.log('Method:', method);

            cookingMethodsInserts.push({ dish_id: dishId, cooking_method_code: method })
          })
        }

        if (originalDish) {
          originalDish.meatType.forEach(meatType => {
            console.log('Meat type:', meatType);
            meatTypesInserts.push({ dish_id: dishId, meat_type_code: meatType })
          })
        }

        results.push({ success: true, dishId })
      } else {
        results.push({ success: false, error: 'Invalid dish data' })
      }
    })

    console.log('Inserting cooking methods:', cookingMethodsInserts);
    console.log('Inserting meat types:', meatTypesInserts);
    // 批量插入烹饪方法关联
    if (cookingMethodsInserts.length > 0) {
      const { error: methodsError } = await client
        .from('dish_cooking_methods')
        .insert(cookingMethodsInserts)
      if (methodsError) throw methodsError
    }

    // 批量插入肉类类型关联
    if (meatTypesInserts.length > 0) {
      const { error: meatTypesError } = await client
        .from('dish_meat_types')
        .insert(meatTypesInserts)
      if (meatTypesError) throw meatTypesError
    }

    return { success: true, results }
  } catch (error: any) {
    console.error('Error in batch insert:', error)
    return { success: false, error: error.message }
  }
})
