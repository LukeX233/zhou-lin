'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/utils'
import { Plus, Trash2, Loader2, Upload, ChevronLeft, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'

interface OptionChoice { value_zh: string; value_en: string; price_modifier: number }
interface OptionGroup  { label_zh: string; label_en: string; is_required: boolean; choices: OptionChoice[] }

export default function NewMenuItemPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,      setLoading]      = useState(false)
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [localImages,  setLocalImages]  = useState<string[]>([])

  // Form fields
  const [nameZh,     setNameZh]     = useState('')
  const [nameEn,     setNameEn]     = useState('')
  const [descZh,     setDescZh]     = useState('')
  const [price,      setPrice]      = useState('')
  const [date,       setDate]       = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [capacity,   setCapacity]   = useState('')
  const [imageUrl,   setImageUrl]   = useState('')  // if using existing public image
  const [useLocalImg, setUseLocalImg] = useState(false)

  const [groups, setGroups] = useState<OptionGroup[]>([])

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isAdmin(user.email)) router.push('/')
    }
    check()
    // List local images from public/images
    setLocalImages([
      '/images/layered-cake.jpg', '/images/osmanthus-cups.jpg', '/images/sponge-cake.jpg',
      '/images/black-sesame-cake.jpg', '/images/matcha-bread.jpg', '/images/custard-bun.jpg',
      '/images/taro-tiramisu.jpg', '/images/matcha-strawberry-cake.jpg', '/images/chocolate-bundt.jpg',
      '/images/taro-bun.jpg', '/images/cream-bread.jpg', '/images/braised-pork.jpg',
      '/images/braised-lotus.jpg', '/images/braised-tray.jpg', '/images/dried-meat.jpg',
    ])
  }, [router, supabase])

  function addGroup() {
    setGroups(g => [...g, { label_zh: '', label_en: '', is_required: true, choices: [] }])
  }
  function removeGroup(gi: number) {
    setGroups(g => g.filter((_, i) => i !== gi))
  }
  function updateGroup(gi: number, field: keyof OptionGroup, val: unknown) {
    setGroups(g => g.map((grp, i) => i === gi ? { ...grp, [field]: val } : grp))
  }
  function addChoice(gi: number) {
    setGroups(g => g.map((grp, i) => i === gi
      ? { ...grp, choices: [...grp.choices, { value_zh: '', value_en: '', price_modifier: 0 }] }
      : grp))
  }
  function removeChoice(gi: number, ci: number) {
    setGroups(g => g.map((grp, i) => i === gi
      ? { ...grp, choices: grp.choices.filter((_, j) => j !== ci) }
      : grp))
  }
  function updateChoice(gi: number, ci: number, field: keyof OptionChoice, val: unknown) {
    setGroups(g => g.map((grp, i) => i === gi
      ? { ...grp, choices: grp.choices.map((c, j) => j === ci ? { ...c, [field]: val } : c) }
      : grp))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nameZh || !price || !date) { toast.error('请填写必填项'); return }

    setLoading(true)
    try {
      let finalImageUrl: string | null = imageUrl || null

      // Upload image if provided
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `items/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('food-photos')
          .upload(path, imageFile)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('food-photos').getPublicUrl(uploadData.path)
        finalImageUrl = publicUrl
      }

      // Create menu item
      const { data: itemData, error: itemErr } = await supabase
        .from('menu_items')
        .insert({
          name_zh:        nameZh.trim(),
          name_en:        nameEn.trim() || null,
          description_zh: descZh.trim() || null,
          price:          parseFloat(price),
          image_url:      finalImageUrl,
          available_date: date,
          pickup_time:    pickupTime.trim() || null,
          capacity:       capacity ? parseInt(capacity) : null,
          is_active:      true,
        })
        .select('id')
        .single()
      if (itemErr) throw itemErr

      // Create option groups & choices
      for (let gi = 0; gi < groups.length; gi++) {
        const grp = groups[gi]
        if (!grp.label_zh.trim()) continue

        const { data: groupData, error: groupErr } = await supabase
          .from('item_option_groups')
          .insert({
            item_id:      itemData.id,
            label_zh:     grp.label_zh.trim(),
            label_en:     grp.label_en.trim() || null,
            is_required:  grp.is_required,
            display_order: gi,
          })
          .select('id')
          .single()
        if (groupErr) throw groupErr

        const choiceInserts = grp.choices
          .filter(c => c.value_zh.trim())
          .map((c, ci) => ({
            group_id:       groupData.id,
            value_zh:       c.value_zh.trim(),
            value_en:       c.value_en.trim() || null,
            price_modifier: c.price_modifier || 0,
            display_order:  ci,
          }))
        if (choiceInserts.length > 0) {
          await supabase.from('item_option_choices').insert(choiceInserts)
        }
      }

      toast.success('商品已创建！')
      router.push('/admin/menu')
    } catch (err) {
      console.error(err)
      toast.error('创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="bg-brown-900 py-10">
        <div className="container-wide">
          <Link href="/admin/menu" className="inline-flex items-center gap-1 text-gold-400 hover:text-gold-300 text-sm mb-3">
            <ChevronLeft size={14} /> 返回菜单管理
          </Link>
          <h1 className="font-serif text-3xl text-cream-100">新建菜单商品</h1>
        </div>
      </div>

      <div className="container-narrow py-10">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Basic info */}
          <div className="card p-6 sm:p-8 space-y-5">
            <h2 className="font-serif text-xl text-brown-900">基本信息</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">中文名称 <span className="text-terra-500">*</span></label>
                <input className="input" placeholder="例：牛腩饭" value={nameZh} onChange={e => setNameZh(e.target.value)} required />
              </div>
              <div>
                <label className="label">英文名称</label>
                <input className="input" placeholder="e.g. Beef Brisket Rice" value={nameEn} onChange={e => setNameEn(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">描述（中文）</label>
              <textarea className="input resize-none h-20" placeholder="商品描述，食材，制作工艺等..." value={descZh} onChange={e => setDescZh(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="label">价格 ($) <span className="text-terra-500">*</span></label>
                <input className="input" type="number" step="0.01" min="0" placeholder="18.00" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
              <div>
                <label className="label">出品日期 <span className="text-terra-500">*</span></label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <label className="label">取餐时间</label>
                <input className="input" placeholder="5:00pm-7:00pm" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
              </div>
              <div>
                <label className="label">限量（空=不限）</label>
                <input className="input" type="number" min="1" placeholder="20" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="card p-6 sm:p-8 space-y-4">
            <h2 className="font-serif text-xl text-brown-900">商品图片</h2>

            {/* Choose from existing */}
            <div>
              <label className="label">从已有图片选择</label>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {localImages.map(src => (
                  <button
                    key={src} type="button"
                    onClick={() => { setImageUrl(src); setImagePreview(null); setImageFile(null) }}
                    className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all
                      ${imageUrl === src ? 'border-gold-500 ring-2 ring-gold-400' : 'border-transparent hover:border-cream-400'}`}
                  >
                    <Image src={src} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Or upload new */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cream-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-brown-400">或上传新图片</span>
              </div>
            </div>

            <label className={`flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed
              cursor-pointer transition-all
              ${imagePreview ? 'border-matcha-400 bg-matcha-400/10' : 'border-cream-300 hover:border-gold-400 hover:bg-cream-200/50'}`}>
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <Image src={imagePreview} alt="Preview" fill className="object-contain rounded-2xl p-1" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-brown-400">
                  <Upload size={20} />
                  <span className="text-sm">上传图片</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>

            {(imageUrl || imagePreview) && (
              <p className="text-xs text-matcha-600">
                ✓ 已选择图片：{imageUrl || '已上传自定义图片'}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="card p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-brown-900">口味选项</h2>
                <p className="text-xs text-brown-400 mt-0.5">如辣度、香菜、葱等，用户下单时选择</p>
              </div>
              <button type="button" onClick={addGroup} className="btn-outline btn btn-sm flex items-center gap-1">
                <Plus size={13} /> 添加选项组
              </button>
            </div>

            {groups.length === 0 && (
              <p className="text-sm text-brown-400 text-center py-4">
                此商品无需选项（如无口味差异），可直接跳过。
              </p>
            )}

            {groups.map((grp, gi) => (
              <div key={gi} className="border-2 border-cream-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <GripVertical size={16} className="text-brown-300 mt-2 shrink-0" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">选项名（中文）</label>
                      <input className="input" placeholder="例：辣度" value={grp.label_zh}
                        onChange={e => updateGroup(gi, 'label_zh', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">选项名（英文）</label>
                      <input className="input" placeholder="e.g. Spice Level" value={grp.label_en}
                        onChange={e => updateGroup(gi, 'label_en', e.target.value)} />
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 cursor-pointer pb-3">
                        <input type="checkbox" checked={grp.is_required}
                          onChange={e => updateGroup(gi, 'is_required', e.target.checked)}
                          className="w-4 h-4 accent-brown-900" />
                        <span className="text-sm text-brown-600">必选</span>
                      </label>
                      <button type="button" onClick={() => removeGroup(gi)}
                        className="pb-3 text-terra-500 hover:text-terra-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Choices */}
                <div className="pl-6 space-y-2">
                  {grp.choices.map((choice, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <input className="input flex-1" placeholder="中文（例：中辣）" value={choice.value_zh}
                        onChange={e => updateChoice(gi, ci, 'value_zh', e.target.value)} />
                      <input className="input w-28" placeholder="英文（可选）" value={choice.value_en}
                        onChange={e => updateChoice(gi, ci, 'value_en', e.target.value)} />
                      <input className="input w-20" type="number" step="0.01" placeholder="+$0" value={choice.price_modifier || ''}
                        onChange={e => updateChoice(gi, ci, 'price_modifier', parseFloat(e.target.value) || 0)} />
                      <button type="button" onClick={() => removeChoice(gi, ci)} className="text-terra-400 hover:text-terra-600 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addChoice(gi)}
                    className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1 mt-1">
                    <Plus size={12} /> 添加选项
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Link href="/admin/menu" className="btn-outline btn flex-1 justify-center">取消</Link>
            <button type="submit" disabled={loading} className="btn-gold btn flex-1 justify-center">
              {loading ? <><Loader2 size={16} className="animate-spin" /> 创建中...</> : '创建商品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
