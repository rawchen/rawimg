import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Spin, Empty, Pagination, Input, Button, Image, message } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { materialApi, MaterialAsset, MaterialCategory } from '@/api';
import { removeOssProcessStyle } from '@/lib/utils';

export type MaterialGroupType = 'portrait' | 'costume' | 'pose';

interface MaterialPickerModalProps {
  open: boolean;
  groupType: MaterialGroupType;
  onClose: () => void;
  onConfirm: (asset: MaterialAsset) => void;
  title?: string;
}

/** 每页素材数量：服装库 10 个/页，人物库、姿态库 15 个/页 */
const GROUP_PAGE_SIZE: Record<MaterialGroupType, number> = {
  portrait: 15,
  costume: 10,
  pose: 15,
};

/** 素材网格列数：一行固定 5 个（15 个 3 行，10 个 2 行） */
const GROUP_GRID_COLS: Record<MaterialGroupType, string> = {
  portrait: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5',
  costume: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5',
  pose: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5',
};

/**
 * 网格区最小高度：按 5 列时的完整行数计算（人物/姿态 3 行、服装 2 行），
 * 保证翻页与最后一页时模态框高度一致，不会出现"不满高度"。
 */
const GRID_MIN_H: Record<MaterialGroupType, string> = {
  portrait: 'min-h-[672px]',
  costume: 'min-h-[500px]',
  pose: 'min-h-[680px]',
};

/** 素材列表查询条件 */
interface AssetQuery {
  libraryType: string;
  /** null = 分类待定（分类尚未加载完成），此时不发列表请求 */
  categoryCode: string | null;
  keyword: string;
  page: number;
}

/** 大类 -> 子库 Tab */
const GROUP_TABS: Record<MaterialGroupType, { libraryType: string; label: string }[]> = {
  portrait: [
    { libraryType: 'portrait_face', label: '人脸' },
    { libraryType: 'portrait_styling', label: '造型' },
  ],
  costume: [
    { libraryType: 'costume_real', label: '写实' },
    { libraryType: 'costume_anime', label: '动漫' },
  ],
  pose: [{ libraryType: 'pose', label: '全部' }],
};

/** 各素材库的卡片宽高比：人物库 4:5、服装库 2:3、姿态库 3:4 */
const GROUP_ASPECT: Record<MaterialGroupType, string> = {
  portrait: 'aspect-[4/5]',
  costume: 'aspect-[2/3]',
  pose: 'aspect-[3/4]',
};

/**
 * 素材库选择器
 * 人物素材库（人脸/造型）、服装素材库（写实/动漫）、姿态库通用。
 */
export function MaterialPickerModal({
  open,
  groupType,
  onClose,
  onConfirm,
  title,
}: MaterialPickerModalProps) {
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  /** 查询条件合并为一份原子状态，避免切库时出现"旧库 + 新分类"的中间态 */
  const [query, setQuery] = useState<AssetQuery>({
    libraryType: '',
    categoryCode: null,
    keyword: '',
    page: 1,
  });
  const [assets, setAssets] = useState<MaterialAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MaterialAsset | null>(null);
  /** 当前预览（详情）的素材：点击列表中的"预览"打开大图详情 */
  const [previewAsset, setPreviewAsset] = useState<MaterialAsset | null>(null);

  /** 分类缓存：同一大类重复打开不再请求 categories */
  const categoriesCacheRef = useRef<Record<string, MaterialCategory[]>>({});
  /** 已发起请求的 key，用于去重 */
  const lastRequestKeyRef = useRef('');
  /** 请求序号，用于丢弃过期响应 */
  const requestSeqRef = useRef(0);

  const tabs = useMemo(() => GROUP_TABS[groupType] ?? GROUP_TABS.pose, [groupType]);
  /** 当前分组的每页数量：服装库 10，人物库/姿态库 15 */
  const pageSize = GROUP_PAGE_SIZE[groupType];

  const loadCategories = useCallback(async () => {
    const cached = categoriesCacheRef.current[groupType];
    if (cached) {
      setCategories(cached);
      setCategoriesReady(true);
      return;
    }
    try {
      const list = (await materialApi.categories({ groupType })) || [];
      categoriesCacheRef.current[groupType] = list;
      setCategories(list);
      setCategoriesReady(true);
    } catch (error) {
      console.error('Failed to load material categories:', error);
      message.error('加载素材分类失败');
      setCategoriesReady(true);
    }
  }, [groupType]);

  const loadAssets = useCallback(async () => {
    const { libraryType, categoryCode, keyword, page: currentPage } = query;
    const pageSize = GROUP_PAGE_SIZE[groupType];
    // 分类尚未确定时先不请求，避免"先拉全部、再拉分类"的重复
    if (!libraryType || categoryCode === null) return;
    const key = `${libraryType}|${categoryCode}|${keyword.trim()}|${currentPage}|${pageSize}`;
    if (lastRequestKeyRef.current === key) return;
    lastRequestKeyRef.current = key;
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const res = await materialApi.assets({
        libraryType,
        categoryCode: categoryCode || undefined,
        keyword: keyword.trim() || undefined,
        page: currentPage,
        size: pageSize,
      });
      if (seq !== requestSeqRef.current) return;
      setAssets(res?.content || []);
      setTotal(res?.totalElements || 0);
    } catch (error) {
      if (seq !== requestSeqRef.current) return;
      console.error('Failed to load material assets:', error);
      message.error('加载素材失败');
      lastRequestKeyRef.current = ''; // 允许下次重试
      setAssets([]);
      setTotal(0);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [query, groupType]);

  // 打开 / 切换大类时重置查询条件
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setPreviewAsset(null);
    setCategories([]);
    setCategoriesReady(false);
    setQuery({
      libraryType: tabs[0]?.libraryType || '',
      categoryCode: null,
      keyword: '',
      page: 1,
    });
    loadCategories();
  }, [open, tabs, loadCategories]);

  // 分类加载完成后自动选中第一个分类，直接按分类请求（不再多拉一次"全部"）
  useEffect(() => {
    if (!open || !categoriesReady) return;
    if (!query.libraryType || query.categoryCode !== null) return;
    const inLibrary = categories.filter((c) => c.libraryType === query.libraryType);
    setQuery((q) =>
      q.categoryCode === null
        ? { ...q, categoryCode: inLibrary.length ? inLibrary[0].categoryCode : '' }
        : q
    );
  }, [open, categoriesReady, categories, query.libraryType, query.categoryCode]);

  useEffect(() => {
    if (open) {
      loadAssets();
    }
  }, [open, loadAssets]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.libraryType === query.libraryType),
    [categories, query.libraryType]
  );

  const handleConfirm = () => {
    if (!selected) {
      message.warning('请先选择一张素材');
      return;
    }
    onConfirm(selected);
    onClose();
  };

  /** 关闭选择器时同步关闭详情弹窗 */
  const handleClose = () => {
    setPreviewAsset(null);
    onClose();
  };

  /** 详情弹窗"应用"：选中该素材并直接使用（等同于底部"使用该素材"） */
  const handleApplyPreview = () => {
    if (!previewAsset) return;
    setSelected(previewAsset);
    setPreviewAsset(null);
    onConfirm(previewAsset);
    onClose();
  };

  /** 详情大图：优先正式图（png 原图），并去掉 OSS 缩略参数 */
  const previewFullUrl = useMemo(() => {
    if (!previewAsset) return '';
    return removeOssProcessStyle(
      previewAsset.fullUrl || previewAsset.previewUrl || previewAsset.thumbUrl || ''
    );
  }, [previewAsset]);

  return (
    <>
    <Modal
      open={open}
      onCancel={handleClose}
      onOk={handleConfirm}
      okText="使用该素材"
      cancelText="取消"
      width={860}
      style={{ top: 16 }}
      zIndex={1100}
      destroyOnClose
      title={title || '素材库'}
      styles={{ body: { padding: 16, maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' } }}
      footer={
        <div className="flex items-center justify-between gap-3">
          {/* 已选素材：放在 footer，高度恒定，避免选中/未选中时模态框跳动 */}
          <div className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <div className="w-9 h-9 shrink-0 overflow-hidden rounded bg-white border border-gray-200">
                  <img
                    src={selected.thumbUrl || selected.previewUrl || selected.fullUrl || ''}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{selected.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {selected.categoryName} · {selected.sourceId}
                  </p>
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-400">未选择素材</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleClose}>取消</Button>
            <Button type="primary" onClick={handleConfirm}>
              使用该素材
            </Button>
          </div>
        </div>
      }
    >
      {/* 大分类 Tab + 搜索（搜索固定在第一行右侧，分类过多也不会多出一行） */}
      <div className="flex items-center gap-2 mb-3">
        {tabs.length > 1 ? (
          tabs.map((tab) => (
            <button
              key={tab.libraryType}
              type="button"
              onClick={() => {
                setQuery((q) => ({
                  ...q,
                  libraryType: tab.libraryType,
                  categoryCode: null,
                  page: 1,
                }));
              }}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors shrink-0 ${
                query.libraryType === tab.libraryType
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))
        ) : (
          <span className="text-sm font-semibold text-gray-900 shrink-0">{tabs[0]?.label}</span>
        )}
        <div className="ml-auto w-56 shrink-0">
          <Input
            size="small"
            allowClear
            placeholder="搜索素材名称"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={query.keyword}
            onChange={(e) => {
              setQuery((q) => ({ ...q, keyword: e.target.value, page: 1 }));
            }}
            onPressEnter={() => setQuery((q) => ({ ...q, page: 1 }))}
          />
        </div>
      </div>

      {/* 子分类 */}
      {visibleCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {visibleCategories.map((cat) => (
            <button
              key={`${cat.libraryType}-${cat.categoryCode}`}
              type="button"
              onClick={() => {
                setQuery((q) => ({ ...q, categoryCode: cat.categoryCode, page: 1 }));
              }}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                query.categoryCode === cat.categoryCode
                  ? 'bg-violet-100 text-violet-700 border border-violet-300'
                  : 'bg-gray-50 text-gray-500 border border-transparent hover:border-gray-200'
              }`}
            >
              {cat.categoryName}
              {typeof cat.assetCount === 'number' && (
                <span className="ml-1 opacity-60">({cat.assetCount})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 素材网格（固定高度 + 加载遮罩，翻页不闪烁、末页高度一致） */}
      <div className={`relative ${GRID_MIN_H[groupType]}`}>
        {/* 加载遮罩：覆盖在旧内容上，避免切换页面时内容消失再出现 */}
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
            <Spin />
          </div>
        )}

        {assets.length === 0 ? (
          loading ? null : <Empty description="暂无素材" className="py-12" />
        ) : (
          <div className={`grid ${GROUP_GRID_COLS[groupType]} gap-2`}>
            {assets.map((asset) => {
              const img = asset.thumbUrl || asset.previewUrl || asset.fullUrl;
              const active = selected?.id === asset.id;
              return (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(asset)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(asset);
                    }
                  }}
                  title={asset.title}
                  className={`group flex flex-col overflow-hidden rounded-lg border-2 bg-white transition-all cursor-pointer ${
                    active
                      ? 'border-violet-500 ring-2 ring-violet-200'
                      : 'border-transparent hover:border-violet-300'
                  }`}
                >
                  <div className={`relative w-full ${GROUP_ASPECT[groupType]} bg-gray-50 overflow-hidden`}>
                    {img ? (
                      <img
                        src={img}
                        alt={asset.title}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        无预览
                      </div>
                    )}
                    {/* 预览：打开详情大图，不改变当前选中项 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAsset(asset);
                      }}
                      className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 px-3 py-2 rounded-md bg-black/55 text-[10px] leading-none text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/75 transition-opacity"
                    >
                      <EyeOutlined />
                      预览
                    </button>
                  </div>
                  <p className="px-1.5 py-1 text-[10px] leading-tight text-gray-600 truncate text-left">
                    {asset.title}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {total > pageSize && (
        <div className="mt-3 flex justify-center">
          <Pagination
            current={query.page}
            pageSize={pageSize}
            total={total}
            onChange={(p) => {
              setQuery((q) => ({ ...q, page: p }));
            }}
            showSizeChanger={false}
            simple
          />
        </div>
      )}
    </Modal>

    {/* 素材详情：放大查看原始 png 图，可"应用"或"取消" */}
    {/* 详情弹窗与列表弹窗是兄弟节点，antd 默认给两者算出相同 zIndex，这里显式抬高一层 */}
    <Modal
      open={!!previewAsset && open}
      onCancel={() => setPreviewAsset(null)}
      width={760}
      zIndex={1200}
      title={previewAsset ? `素材详情 · ${previewAsset.title}` : '素材详情'}
      styles={{ body: { padding: 16 } }}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => setPreviewAsset(null)}>取消</Button>
          <Button type="primary" onClick={handleApplyPreview}>
            应用该素材
          </Button>
        </div>
      }
    >
      {previewAsset && (
        <div className="flex gap-4">
          {/* 大图区域：点击可再放大到全屏 */}
          <div className="flex-1 min-w-0 flex items-center justify-center bg-gray-50 rounded-lg p-2 overflow-hidden">
            {previewFullUrl ? (
              <Image
                src={previewFullUrl}
                alt={previewAsset.title}
                className="max-h-[58vh] w-auto object-contain"
                preview={{
                  src: previewFullUrl,
                  mask: <span className="text-white text-xs">点击查看原图</span>,
                }}
              />
            ) : (
              <Empty description="无预览图" />
            )}
          </div>
          {/* 素材信息 */}
          <div className="w-56 shrink-0 text-xs space-y-2.5">
            <div>
              <p className="text-gray-400 mb-0.5">名称</p>
              <p className="text-gray-800 font-medium break-all">{previewAsset.title}</p>
            </div>
            {previewAsset.titleOrigin && (
              <div>
                <p className="text-gray-400 mb-0.5">原始名称</p>
                <p className="text-gray-700 break-all">{previewAsset.titleOrigin}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 mb-0.5">分类</p>
              <p className="text-gray-700">
                {previewAsset.categoryName || previewAsset.categoryCode || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">来源 ID</p>
              <p className="text-gray-700 break-all">{previewAsset.sourceId || '-'}</p>
            </div>
            {(previewAsset.width || previewAsset.height) && (
              <div>
                <p className="text-gray-400 mb-0.5">尺寸</p>
                <p className="text-gray-700">
                  {previewAsset.width || '?'} × {previewAsset.height || '?'}
                </p>
              </div>
            )}
            {previewFullUrl && (
              <a
                href={previewFullUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-violet-600 hover:underline"
              >
                在新窗口打开原图
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}
