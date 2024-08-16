<template>
  <UContainer>
    <div class="m-4">
      <div class="w-full flex flex mb-4">
        <!-- input -->
        <div class="flex-1">
          <div class="mb-2">输入你的想法</div>
          <UTextarea v-model="userInput" color="primary" variant="outline" placeholder="Search..." />
        </div>
        <!-- buttons -->
        <div class="flex flex-1 justify-center gap-4 h-max pl-4">
          <UButton label="生成" @click="genDishes" :disabled="isLoading" />
          <UButton label="清空" @click="() => {
            cards = []
            toast.add({
              title: '清空成功',
            })
          }" />
          <UButton label="提交" @click="submit" :disabled="submitLoading" />
        </div>
      </div>
      <!-- cardList -->
      <div class="bg-bluegray h-auto
     overflow-y-auto rounded-2xl  p-2 ">
        <template v-if="cards.length">
          <div class="flex flex-wrap gap-2">
            <div v-for="(card, index) in cards" :key="card.name"
              class="w-[calc((100%-24px)/4)] h-max p-4 relative border border-coolGray rounded-lg bg-white dark:bg-dark shadow-2xl ">
              <UForm :validate="validateCard" :state="card" class="space-y-4" ref="formRef">
                <UFormGroup label="名称" name="name">
                  <UInput v-model="card.name" />
                </UFormGroup>

                <UFormGroup label="描述" name="description">
                  <UTextarea v-model="card.description" resize type="description" />
                </UFormGroup>

                <UFormGroup label="方式" name="cookingMethod">
                  <USelectMenu v-model="card.cookingMethod" :options="COOKING_METHODS" clearable multiple
                    value-attribute="value" option-attribute="label" />
                </UFormGroup>

                <UFormGroup label="肉类" name="meatType">
                  <USelectMenu v-model="card.meatType" :options="MEAT_TYPES" multiple value-attribute="value"
                    option-attribute="label" />
                </UFormGroup>
              </UForm>
              <div
                class="w-32px h-32px bg-bluegray absolute -right-2px -top-2px rounded-xl flex justify-center items-center">
                <div class="i-icon-park-solid:delete text-color-red hover:cursor-pointer" @click="remove(index)"> </div>
              </div>
            </div>
          </div>
        </template>
        <template v-if="isLoading">
          <div>generating...</div>
        </template>
        <!-- add -->
        <div
          class="w-[calc((100%-24px)/4)] h-32 border border-dashed border-gray-300 rounded-lg flex justify-center items-center  hover:cursor-pointer"
          :class="{ 'mt-8': cards.length }" @click="add">
          <div class="i-icon-park-solid:add-one text-white w-36px h-36px"></div>
        </div>
      </div>
    </div>
  </UContainer>
  <UNotifications icon="i-heroicons-check-circle" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
type CookingMethod = "STIR_FRY" | "STEAM" | "BRAISE" | "FRY" | "SALAD" | "ROAST";
type MeatType = "BEEF" | "PORK" | "LAMB" | "CHICKEN" | "SEAFOOD";

interface Card {
  name: string;
  description: string;
  cookingMethod?: CookingMethod[];
  meatType?: MeatType[];
}

const DEFAULT_IMAGE_URL = 'https://pdmmdeucmfnmsalljpjb.supabase.co/storage/v1/object/public/dishes/dishes/2024-08-12T18:31:19.913496_image_cropper_323336AF-362A-44A0-84C3-484DE904FD7F-29370-00000BC01E38251F.jpg'
const COOKING_METHODS = [
  { "value": "STIR_FRY", "label": "炒" },
  { "value": "STEAM", "label": "蒸" },
  { "value": "BRAISE", "label": "焖" },
  { "value": "FRY", "label": "炸" },
  { "value": "SALAD", "label": "凉拌" },
  { "value": "ROAST", "label": "烤" }
]

const MEAT_TYPES = [
  { "value": "BEEF", "label": "牛肉" },
  { "value": "PORK", "label": "猪肉" },
  { "value": "LAMB", "label": "羊肉" },
  { "value": "CHICKEN", "label": "鸡肉" },
  { "value": "SEAFOOD", "label": "海鲜" }
]

const userInput = ref('')
const response = ref('')
const isLoading = ref(false)
const submitLoading = ref(false)
const toast = useToast()


async function genDishes() {
  isLoading.value = true

  try {
    const { data } = await useFetch('/api/chat', {
      method: 'POST',
      body: {
        model: "gpt-4o",
        messages: [
          {
            role: "system", content: `
            生成菜谱,
            {
              "name": "string",
              "description": "string",
              "cookingMethod": [],
              "meatType": []
            }
              
            description为菜品的原材料和调料即可
            cookingMethod as Array, 请从"STIR_FRY" | "STEAM" | "BRAISE" | "FRY" | "SALAD" | "ROAST"中分类, 
            meatType  as Array, 请从"BEEF" | "PORK" | "LAMB" | "CHICKEN" | "SEAFOOD"中自动分类, 
            需要生成多个, 然后组合成一个json数组
            肉类和方式可以是多选
            以上所有参数为必填
            保证响应内容只显示数组，不需要显示其他内容
          ` },
          { role: "user", content: userInput.value }
        ]
      }
    })

    response.value = (data.value as any).choices[0].message.content
    cards.value = JSON.parse(response.value)
    userInput.value = '' // Clear input after sending
  } catch (error) {
    console.error('Error:', error)
    response.value = 'An error occurred while fetching the response.'
  } finally {
    isLoading.value = false
  }
}

async function addDishes() {
  submitLoading.value = true
  const dishes = cards.value.map(card => {
    return {
      name: card.name,
      description: card.description,
      cookingMethod: card.cookingMethod,
      meatType: card.meatType,
      imageUrl: DEFAULT_IMAGE_URL
    }
  })

  const { data, error }: any = await useFetch('/api/add-dishes-batch', {
    method: 'POST',
    body: dishes
  })
  console.log(data);
  if (data.value?.success) {
    console.log('Dishes added successfully:', data.value.results)
    toast.add({
      title: 'Dishes added successfully',
    })
  } else {
    console.error('Failed to add dishes:', error.value || data.value?.error)
  }
  submitLoading.value = false
}

const cards = ref<Card[]>([]);
const add = () => {
  cards.value.push({
    name: '',
    description: '',
    cookingMethod: [],
    meatType: []
  })
}
const submit = async () => {
  const isValid = await triggerValidationAwait()
  if (isValid) {
    addDishes()
  }
}
const remove = async (index: number) => {
  cards.value.splice(index, 1)
}

const formRef = ref(null)
const triggerValidationAwait = async () => {
  const form: any = formRef.value
  if (form) {
    const res = await Promise.all(
      form.map((form: any) => form.validate())
    );
    if (res && res.length) return true
    return false
  }
  return false
};

const validateCard = (state: Card) => {
  const errors = []
  if (!state.name) errors.push({ path: 'name', message: 'Required' })
  if (!state.description) errors.push({ path: 'description', message: 'Required' })
  if (!state.cookingMethod?.length) errors.push({ path: 'cookingMethod', message: 'Required' })
  if (!state.meatType?.length) errors.push({ path: 'meatType', message: 'Required' })
  return errors
} 
</script>

<style scoped>
textarea {
  width: 100%;
  height: 100px;
  margin-bottom: 10px;
}
</style>