import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  ChevronRight, 
  ChevronLeft, 
  ShoppingBag, 
  Home as HomeIcon, 
  Utensils, 
  Sparkles, 
  Type, 
  Image as ImageIcon, 
  Download, 
  History,
  Trash2,
  Check,
  RefreshCw,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Category = 'beauty' | 'home' | 'food';
type Resolution = '1k' | '2k' | '4k';
type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9';

interface HistoryItem {
  id: string;
  url: string;
  b64?: string;
  category: Category;
  subCategory: string;
  title: string;
  description: string;
  style: string;
  timestamp: number;
}

// --- Constants ---
const CATEGORIES = [
  { id: 'beauty', name: '美妆护肤类', icon: Camera, color: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'home', name: '家居/生活用品', icon: HomeIcon, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'food', name: '食品/饮料', icon: Utensils, color: 'bg-orange-50 text-orange-600 border-orange-100' },
];

const ASPECT_RATIOS: Record<AspectRatio, string> = {
  '1:1': '1:1',
  '3:4': '3:4',
  '4:3': '4:3',
  '16:9': '16:9',
};

const SUB_CATEGORIES: Record<Category, Record<string, string[]>> = {
  beauty: {
    '彩妆': ['口红', '唇釉', '眼影', '粉底', '腮红'],
    '护肤': ['精华液', '面霜', '乳液', '面膜', '爽肤水', '眼霜'],
    '美妆工具': ['化妆刷', '美妆蛋'],
  },
  home: {
    '饮具': ['水杯', '保温杯', '玻璃杯', '马克杯', '运动水壶'],
    '家居用品': ['灯具', '桌椅', '收纳盒', '装饰品'],
    '厨房用品': ['餐具', '刀具', '锅具'],
  },
  food: {
    '饮料': ['果汁', '茶饮', '碳酸饮料'],
    '零食': ['薯片', '饼干', '巧克力'],
  },
};

interface Style {
  id: string;
  name: string;
  preview?: string;
  prompt: (title: string, desc: string, prod: string) => string;
}

const CATEGORY_STYLES: Record<string, Style[]> = {
  beauty: [
    { id: 'skincare_forest', name: '森林自然', preview: '/picture/护肤森林自然.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张关于【${p}】的护肤品宣传图。题材为【${p}】。
主体产品：由输入图像提取的【${p}】。100%还原产品的造型、颜色、材质、纹理、标签及品牌Logo。产品端正放置在画面中心一个生长着嫩绿苔藓的深褐色朽木支架上。
场景构思：
- 前景：朽木支座周围点缀着几片带有晶莹露珠的波士顿蕨叶片，增加画面的层次感与生机感。
- 背景：极其柔和虚化的森林背景，阳光穿过高大的树冠层，形成梦幻般的丁达尔效应，光斑点点。
- 光影：柔和的侧逆光，勾勒出产品的边缘轮廓，营造出一种天然、纯净、高科技提取的治愈系氛围。
文字渲染：主标题“${t}”和品牌介绍“${d}”以精致的排版呈现在画面留白处。
约束：保持苔藓、朽木、蕨叶和整体森系绿调，严禁改变产品特征。` },
    { id: 'skincare_beach', name: '金色沙滩', preview: '/picture/护肤金色沙滩.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张关于【${p}】的高端护肤品商业摄影。题材为【${p}】。
主体产品：由输入图像提取的【${p}】。产品倾斜放置在前景一块带有波浪纹理的米白色珊瑚礁石上。100%还原产品的颜色、包装细节和标识。
场景构思：
- 前景：珊瑚石缝隙中散落着几粒圆润的白色珍珠和一小截浅色的干枯海草分支。
- 背景：渐变且虚化的海边黄昏美景。温暖的橙金色夕照洒在波光粼粼的水面上，形成璀璨的散景效果。
- 光影：采用暖调的黄金时刻自然光，光线呈30度角照射，投射出柔和而修长的影子。色温偏暖，营造出奢华、舒适、度假感的护肤体验。
文字渲染：雅致的宋体或衬线体展示“${t}”和“${d}”。
约束：保持珊瑚石、珍珠、暖色调水面背景的布局，严禁改变产品特征。` },
    { id: 'beauty_vintage', name: '复古油画', preview: '/picture/彩妆复古油画.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张复古油画风格的美妆产品宣传图。题材为【${p}】。
主体产品：由输入图像提取的【${p}】。产品垂直或稳妥放置在画面中心一个粗燥质感的浅灰色岩石/石块底座上。100%还原产品的造型、颜色、材质、纹理、标签及品牌Logo。
场景构思：
- 前景：岩石底座前方或侧方斜放着一片干燥的橙色/褐色秋季落叶。
- 背景：极其柔和虚化的暖米色背景，后方立着一面精致的金色复古圆镜，镜框带有复杂的雕花细节，营造一种艺术、怀旧的氛围。
- 光影：暖橙调的侧光源斜向照射，形成明亮的高光部分和拉长的投影，呈现出高级油画般的质感与电影感。
文字渲染：主标题“${t}”和文案“${d}”排版讲究。
约束：保持岩石底座、复古镜子、秋叶等核心元素，严禁改变产品特征。` },
    { id: 'beauty_high_end', name: '高端大气', preview: '/picture/彩妆高端大气.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张现代极简主义风格的高级美妆商业广告。题材为【${p}】。
主体产品：由输入图像提取的【${p}】。产品稳固地陈列在中心一个由透亮的茶色玻璃和哑光黑色金属构成的多层展示台架上。100%保持产品的品牌辨识度。
场景构思：
- 场景：深灰黑色的工业风背景，具有磨砂或丝绒般的高级质感。
- 配饰：周围极其简洁，仅在侧后方有一组由LED线条构成的发光轮廓，强调科技感与品牌地位。
- 光影：冷白色的硬朗光线，主要勾勒出玻璃支架和产品的轮廓边缘，形成极其锐利的高光。明暗对比对比强烈，呈现极致的现代冷酷感与极致奢华。
文字渲染：主标题“${t}”和文案“${d}”居中排列。
约束：保持黑色展示支架及多层结构、硬朗冷光氛围，严禁改变产品特征。` },
    { id: 'beauty_tool_minimal', name: '简洁风格', preview: '/picture/美妆工具简洁风格.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张清透极简风格的美妆工具产品宣传照。题材为【${p}】。
主体产品：由输入图像提取的【${p}】。100%还原产品的原本形态、细节和所有品牌Logo。产品垂直立在画面中央一个极小、半透明的磨砂亚克力圆顶基座上。
场景构思：
- 背景：纯净、极其柔和的浅天蓝色背景，无边际空间感。
- 装饰：基座下方或周围散布几粒晶莹剔透的水滴，以及一片半透明、边缘轻盈的白色花瓣。
- 光影：采用高调顺光结合柔和的边缘光，去除一切厚重对比。整体色调以浅蓝色、纯白色和产品原色为主，营造极其轻盈、洁净、无暇的视觉感受。
文字渲染：标题“${t}”和描述“${d}”居上侧或居中排布。
约束：保持磨砂底座、水滴、花瓣和清透浅蓝背景，严禁改变产品特征。` },
    { id: 'beauty_tool_macro', name: '细节特摄', preview: '/picture/美妆工具细节特摄.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张关于【${p}】的极致细节微距摄影。题材为【${p}】。
主体产品：由输入图像提取的【${p}】。产品倾斜放置在前景一个圆形的透明玻璃/镜面底座上，底部倒影清晰可见。100%还原产品的细腻纹理（如海绵孔隙、刷毛质感）、颜色、造型及标识。
场景构思：
- 背景：极其柔和的浅肉粉色/莫兰迪粉色调，景深极浅。背景中隐约可见其他虚化的同类产品或几何支撑体，增加画面的层次感与高级感。
- 光影：采用全覆盖柔白色漫射光，营造出一种清透、无暇、充满温润质感的氛围。光影过滤得极其平滑，呈现出顶级商业摄影的质感。
文字渲染：标题“${t}”和文案“${d}”以简约的中英文字体优雅排布。
约束：保持镜面反射效果，背景虚化效果及整体淡粉色调，严禁改变产品特征。` }
  ],
  home: [
    { id: 'drinkware_metal', name: '金属力量', preview: '/picture/饮具金属力量.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 生成一张竖版中近景产品宣传海报，风格为现代简约与写实渲染相结合，氛围高端、神秘且充满力量感。
主体产品：输入图像中的【${p}】。主体呈圆柱形或对应形状，材质呈现金属、玻璃 or 磨砂质感，表面有细节纹理和光泽。产品整体略微倾斜，悬浮在空中，体现动感和立体感。
前景元素：一个大型、不规则【岩石】，表面质感粗糙，颜色深棕或暗灰。岩石上散落【金色晶体碎片】，大小不一，形状为棱角或片状，表面光滑、反光明显，呈爆裂或散落效果，增强视觉冲击力。
背景：纯色渐变，从上方【米黄色】过渡到下方【深棕色】，模糊处理突出主体和前景，营造抽象非写实氛围。
光线与色调：主光源来自画面左上方，光线温暖偏黄色，照射在产品、岩石和晶体上，产生强烈反光和阴影，强化立体感与质感。整体色调以米黄色、金色、深棕色、黑色为主。
文字渲染：下方严格保留解释性文字“${d}”及品牌标题“${t}”，字体清晰，位置固定在底部区域。
约束：100%保留产品原本的标签、Logo和细节。` },
    { id: 'drinkware_serene', name: '静谧温暖', preview: '/picture/饮具静谧温馨.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张静物摄影风格的产品海报，题材为日常生活场景，风格简约现代，氛围宁静温馨。
主体产品：输入图像中的【${p}】。产品呈倾斜姿态，正从开口处向下方一个纯白色陶瓷咖啡杯中注水，水流呈细柱状清晰可见。
空间布局：背景为纯色暖棕色墙面，台面为浅米色。前景左下角有一颗带蒂的鲜红圣女果；右侧有一张白色小卡片，部分被一个带金边的浅绿色盘子边缘遮挡。
中景核心：白色陶瓷咖啡杯和配套圆形碟子位于中心。主体产品【${p}】必须100%保留原本的材质感、颜色、形状和所有文字标识。
光线与色彩：光源来自右上方，光线柔和，在桌面和背景投射出清晰阴影。色温偏暖，色调以米白、浅棕、鲜红为主。
文字渲染：品牌标题“${t}”和介绍“${d}”以优雅排版呈现在画面留白处。
约束：严格保留所有道具的相对位置关系，保持手部与产品的交互感，严禁改变产品标签细节。` },
    { id: 'furniture_minimalist', name: '极简主义', preview: '/picture/家具用品极简主义.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张室内家居的宣传图片，题材为【${p}】。风格为现代极简，整体氛围宁静、舒适且略带高级感。
主体产品：由输入图像提取的【${p}】。放置在画面底部圆形浅米色编织地毯上。100%还原产品的造型、颜色和材质。
空间布局：
- 前景：带有同心圆纹理的米色地毯。
- 中景：左侧有一个深棕色木质矮柜，上方摆放橙黄色和浅米色花瓶，插有绿植；矮柜左侧墙上悬挂金色椭圆镜。
- 灯光：画面右侧有两盏深红色落地灯，灯杆纤细弯曲，灯光精准照射在【${p}】上，并投射出艺术感的投影。
背景：浅米色墙壁，光线柔和清透，主色调为暖米色、深棕与赭红。
文字渲染：主标题“${t}”和文案“${d}”以极简主义排版呈现在画面上方留白处。
约束：保持背景中极简家具、落地灯、镜子的摆放和整体构图，严禁改变产品特征。` },
    { id: 'furniture_healing', name: '治愈生活', preview: '/picture/家具用品治愈风格.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张关于【${p}】的治愈系家居氛围图。整体色调柔和温暖，充满生活气息。
主体产品：输入图像中的【${p}】。放置在温暖的实木地板上，光影斑驳。
场景元素：周围散落着几本杂质、一个质感细腻的陶瓷咖啡杯，以及几支虚化的鲜花。窗外的阳光透过轻薄的白纱帘洒在产品表面，形成柔和的高光。
背景：米白色棉麻窗帘或浅木色墙面，营造出舒适、慵懒的午后时光感。
文字渲染：优雅的手写体或轻盈的宋体显示“${t}”和“${d}”，位置协调。
约束：保持产品的原始形态、色彩和品牌标识细节，追求极致的视觉舒适度。` },
    { id: 'kitchen_warm', name: '温馨恬静', preview: '/picture/厨房用具温馨恬静.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张商业产品宣传海报，风格为温馨恬静。
主体产品：由输入图像提取的【${p}】。产品堆放或陈列在画面中心的白色几何立方体支架及周围地面。100%还原产品的造型、色彩、花纹及所有文字细节。
场景构思：
- 场景：纯色橙黄色空间，色调温馨清透。一个简洁的白色几何立方体位于中心。
- 配饰：右侧放置一个装有浅黄色液体的细长高脚杯；地面散落几朵细碎的黄色和红色小装饰花瓣。
- 光影：光线来自上方，在垂直面和平面投射出清晰、硬朗的投影，增强空间立体感。
文字渲染：主标题“${t}”和品牌介绍“${d}”以精致的排版呈现在画面上方留白处。
约束：保持与参考图一致的构图、配色和支撑关系，严禁改变产品特征。` },
    { id: 'kitchen_macro', name: '特写镜头', preview: '/picture/厨房用具特写镜头.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一张高级暗调商业摄影海报，风格为冷峻、专业、充满质感。
主体产品：由输入图像提取的多个【${p}】。它们呈对角线错落摆放在一块带有深色木纹的厚实砧板上。100%保留产品的真实材质（如不锈钢光泽、纹理细节）。
场景构思：
- 背景：极深灰色接近黑色的哑光背景。
- 配饰：画面右上方部分露出一个深色波浪纹圆盘，盘中盛有煎至金黄的牛排、意大利面及一株迷迭香。左上方角落有一小碟深褐色的咖啡豆。
- 光影：采用强烈的侧逆光，在产品的金属边缘、砧板纹理和食物表面形成锐利的高光，阴影深邃，极具电影感。
文字渲染：顶部中央以超大优雅衬线体显示“CHUYING SHOOT”及“${t}”，下方辅以“${d}”的小字介绍。
约束：保持暗色砧板、食物拼盘、咖啡豆的相对布局，严禁改变产品特征。` }
  ],
  food: [
    { id: 'beverage_nature', name: '户外自然风格', preview: '/picture/饮料户外自然风格.jpg', prompt: (t, d, p) => `[SYSTEM: SUPREME FIDELITY] 这是一幅充满奇幻色彩的商业广告摄影风格图像，题材为【${p}】。场景设定在一个由冰块、碎冰和薄荷叶构成的微缩冰川世界，整体风格超现实且清爽。
画面核心：
1. 核心产品：由原图提取的【${p}】放置在冰块斜坡上，罐身/瓶身满布细密水珠，100%保留原始形状、颜色及标签细节。
2. 微缩世界：多位穿着鲜艳登山服的微缩人物正在产品形成的“冰川”上攀冰，动作写实且充满力量感。
3. 装饰元素：画面中散布新鲜的水果切片和翠绿的薄荷叶，部分半浸在碎冰中。
文字渲染：
- 标题“${t}”和描述“${d}”需以专业美工排版形式呈现在背景蓝天部分，严禁遮挡产品，严禁文字乱码。
视觉风格：
- 冷色调蓝白光，冰川晶莹剔透。高饱和度，高对比度，呈现顶级商业摄影质感。` },
    { id: 'beverage_comm', name: '商业摄影风格', preview: '/picture/饮料商业拍摄风格.jpg', prompt: (t, d, p) => `[STRICT FIDELITY] 这是一幅商业广告摄影风格的AI生成图像，题材为【${p}】，营造清新、活力、诱人的氛围。画面采用中景拍摄，机位略微仰视，透视感较强，突出主体。
画面主体为一瓶透明玻璃瓶装的产品，瓶身由输入图像提取。瓶身布满细密水珠，显示出冰镇感。标签上方印有主视觉品牌文字“${t}”，下方是较小字体的副标题文字“${d}”。标签文字必须极其清晰。瓶内液体透亮，透过玻璃可以看到液面。
围绕饮料瓶，画面中散布多个元素：
前景：画面底部反射瓶身和环境，呈水面效果，散落水珠；左右两侧放置新鲜水果切片，表面细节清晰。
中景：饮料瓶为视觉中心，倾斜悬浮，周围有液体飞溅效果，冰块散落在瓶周围，几片绿叶在空中环绕瓶身。
背景：梦幻渐变色背景，散布大小不一、虚实结合的光斑，营造梦幻氛围。
光线柔和明亮，突出玻璃瓶质感和水珠晶莹感。整体色调鲜艳饱和，充满活力。
生成约束（必须保留）：
1. 饮料瓶的品牌名称“${t}”及文字信息“${d}”必须清晰呈现，严禁乱码，严禁覆盖产品。
2. 饮料瓶原本的形状、颜色、标签细节和水珠质感必须100%保留。
3. 前景水果、冰块、漂浮叶子和液体飞溅的相对位置及动态感需达到专业商业摄影标准。` },
    { id: 'snack_micro', name: '微摄角度', preview: '/picture/零食微摄角度.jpg', prompt: (t, d, p) => `[SYSTEM: SUPREME FIDELITY] 生成一张竖版中景零食产品宣传图，题材为【${p}】，风格为现代简约广告摄影。
场景核心：
1. 主体：三块【${p}】产品，100%保留输入图像的纹理、馅料及细节。两块堆叠在前景碎屑上，一块呈轻微悬浮感，突出极致立体感。
2. 前景：散落不规则的碎屑及配料，材质细腻，与产品色泽高度统一。
3. 背景：纯净暖棕色渐变背景，光影柔和，背景略微虚化以增强层次感。
文字渲染：
- 左上角：白色无衬线英文字体显示“${t}”。
- 右下角：白色中文艺术排版显示介绍“${d}”。
- 约束：文字必须极其锐利清晰，禁止乱码，严禁遮挡产品。
光线：主侧光来自左上方，勾勒产品边缘，色温偏暖，呈现高品质商业诱人质感。` },
    { id: 'snack_closeup', name: '特写视角', preview: '/picture/零食特写视角.jpg', prompt: (t, d, p) => `[SYSTEM: SUPREME FIDELITY] 生成一张竖版中近景广告宣传图，题材为【${p}】，风格为现代精致食品摄影。营造诱人且动感的氛围。
    场景核心：
    1. 主体产品：多块【${p}】产品在空间中动感飞舞，部分悬浮或倾斜。100%还原产品的形状、大小、颜色、纹理（如烘焙痕迹、果仁、巧克力豆或飞溅痕迹）。
    2. 布局布局：前景有几块产品作为焦点，中景主体悬浮中央偏左，周围散布细小的碎屑、粉末或液滴以增加动感和真实感。
    3. 背景：采用纯暖色系渐变（如暖棕色、从浅到深），背景虚化处理以突出主体。
    文字渲染：
    - 标题“${t}”和描述“${d}”需以专业商业广告排版形式呈现。
    - 所有Logo及文字信息必须定位清晰，字符极其锐利，严禁乱码。保持品牌样式不变。
    光线与细节：
    - 主光源来自左上方，形成柔和方向性高光，突出产品立体感。
    - 细节极其丰富，包含表面纹理、光泽和破裂痕迹，呈现顶级商业摄影质感。` },
  ],
};

// --- Components ---
export default function App() {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategoryGroup, setSelectedSubCategoryGroup] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activeStyleId, setActiveStyleId] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('1k');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewHistory, setViewHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);

  // SaaS Integration State
  const [saasInfo, setSaasInfo] = useState<{
    userId: string;
    toolId: string;
    userName?: string;
    userIntegral?: number;
    toolIntegral?: number;
    context?: string;
    prompt?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // SaaS Initialization
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'SAAS_INIT') {
        const { userId, toolId, context, prompt } = event.data;
        // Filter "null"/"undefined" strings
        const cleanUserId = userId === 'null' || userId === 'undefined' ? null : userId;
        const cleanToolId = toolId === 'null' || toolId === 'undefined' ? null : toolId;

        if (cleanUserId && cleanToolId) {
          try {
            const res = await fetch('/api/tool/launch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: cleanUserId, toolId: cleanToolId })
            });
            const result = await res.json();
            if (result.success) {
              setSaasInfo({
                userId: cleanUserId,
                toolId: cleanToolId,
                userName: result.data.user.name,
                userIntegral: result.data.user.integral,
                toolIntegral: result.data.tool.integral,
                context: context && context !== 'null' && context !== 'undefined' ? context : undefined,
                prompt: Array.isArray(prompt) ? prompt : []
              });
            }
          } catch (err) {
            console.error('SaaS Launch failed:', err);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Get styles based on category and current selection
  const getStyles = () => {
    if (!selectedCategory) return [];
    const allStyles = CATEGORY_STYLES[selectedCategory] || [];
    
    // Strict filtering based on sub-category selection
    if (selectedCategory === 'beauty') {
      if (selectedProduct === '美妆工具') {
        return allStyles.filter(s => s.id.startsWith('beauty_tool_'));
      }
      if (selectedProduct === '护肤') {
        return allStyles.filter(s => s.id.startsWith('skincare_'));
      }
      if (selectedProduct === '彩妆') {
        return allStyles.filter(s => s.id.startsWith('beauty_') && !s.id.startsWith('beauty_tool_'));
      }
    }

    if (selectedCategory === 'home') {
      if (selectedProduct === '饮具') {
        return allStyles.filter(s => s.id.startsWith('drinkware_'));
      }
      if (selectedProduct === '家居用品') {
        return allStyles.filter(s => s.id.startsWith('furniture_'));
      }
      if (selectedProduct === '厨房用品') {
        return allStyles.filter(s => s.id.startsWith('kitchen_'));
      }
    }

    if (selectedCategory === 'food') {
      if (selectedProduct === '饮料') {
        return allStyles.filter(s => s.id.startsWith('beverage_'));
      }
      if (selectedProduct === '零食') {
        return allStyles.filter(s => s.id.startsWith('snack_'));
      }
    }

    return allStyles;
  };

  const currentStyles = getStyles();
  
  useEffect(() => {
    const s = getStyles();
    if (s.length > 0) setActiveStyleId(s[0].id);
  }, [selectedCategory, selectedProduct]);

  // Handle image analysis
  const analyzeProduct = async () => {
    if (!uploadedImage) {
      alert('请先上传图片。');
      return;
    }

    setIsAnalyzing(true);
    try {
      const base64Data = uploadedImage.split(',')[1];
      const mimeType = uploadedImage.split(';')[0].split(':')[1];

      // Use flash model for fast analysis (performed on server)
      const prompt = "请分析这张产品图片，并提供一个简洁吸引人的标题（10字以内）和一段简短的产品介绍（20字以内）。请严格以纯JSON格式返回，不要包含任何Markdown标记或多余文字，结构如下：{\"title\": \"...\", \"description\": \"...\"}。语言为中文。";

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          prompt,
          image: base64Data,
          mimeType
        })
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      let text = result.text?.trim() || "";
      
      // Clean potential markdown code blocks
      if (text.includes("```")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      try {
        const data = JSON.parse(text);
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
      } catch (e) {
        console.error("JSON parsing failed, falling back to regex", e);
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('产品分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle generation with absolute fidelity instructions
  const generateImage = async () => {
    if (!uploadedImage || !selectedCategory) return;

    setIsGenerating(true);
    setResultImage(null);

    // SaaS Verification
    if (saasInfo) {
      try {
        const verifyRes = await fetch('/api/tool/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: saasInfo.userId, toolId: saasInfo.toolId })
        });
        const verifyResult = await verifyRes.json();
        if (!verifyResult.success) {
          alert(verifyResult.message || '积分不足，无法生成');
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        console.error('Verification failed:', err);
        alert('校验积分失败，请稍后重试');
        setIsGenerating(false);
        return;
      }
    }

    const styleObj = currentStyles.find(s => s.id === activeStyleId) || currentStyles[0];

    // Combine parameters: Preset Style + SaaS Context + SaaS Keywords
    const saasContext = saasInfo?.context ? `\n- SaaS Context: ${saasInfo.context}` : '';
    const saasKeywords = saasInfo?.prompt?.length ? `\n- SaaS Keywords: ${saasInfo.prompt.join(', ')}` : '';

    const prompt = `[SYSTEM: ECOMMERCE DESIGNER MODE]
    PHASE 1: IMAGE GENERATION
    - Take the product from the input image.
    - Surround it with the environment: ${styleObj.prompt(title, description, selectedProduct)}
    ${saasContext}${saasKeywords}
    - Maintain 100% fidelity of the product's shape, color, and labels.
    - Ensure professional lighting and shadows relative to the new scene.

    PHASE 2: TYPOGRAPHY & TEXT OVERLAY
    - After generating the scene, overlay title: "${title}" and description: "${description}".
    - Use professional graphic design layouts.
    - Ensure text is legible and does not overlap the product body.

    FINAL OUTPUT: High-quality professional product photography.`;

    try {
      const base64Data = uploadedImage.split(',')[1];
      const mimeType = uploadedImage.split(';')[0].split(':')[1];

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt,
          image: base64Data,
          mimeType,
          config: {
            imageConfig: {
              aspectRatio: ASPECT_RATIOS[aspectRatio],
              imageSize: resolution === '4k' ? '4K' : resolution === '2k' ? '2K' : '1K'
            }
          }
        })
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      let b64 = null;
      const parts = result.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            b64 = part.inlineData.data;
            break;
          }
        }
      }

        if (b64) {
        const imageUrl = `data:image/png;base64,${b64}`;
        setResultImage(imageUrl);
        
        saveToHistory({
          id: Date.now().toString(),
          url: imageUrl,
          category: selectedCategory,
          subCategory: selectedProduct,
          title,
          description,
          style: styleObj.name,
          timestamp: Date.now(),
        });

        // Jump to history to see the result
        setStep(1); // Reset to base step or keep view clean
        setViewHistory(true);

        // SaaS Consumption
        if (saasInfo) {
          try {
            const consumeRes = await fetch('/api/tool/consume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: saasInfo.userId, toolId: saasInfo.toolId })
            });
            const consumeResult = await consumeRes.json();
            if (consumeResult.success) {
              setSaasInfo(prev => prev ? { ...prev, userIntegral: consumeResult.data.currentIntegral } : null);
              
              // Persist the generated image to SaaS backend (UserImage table)
              try {
                await fetch('/api/upload/image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: saasInfo.userId,
                    base64: imageUrl,
                    source: 'result'
                  })
                });
              } catch (uploadErr) {
                console.error('Image persistence failed:', uploadErr);
              }
            }
          } catch (err) {
            console.error('Consumption failed:', err);
          }
        }
      } else {
        throw new Error('未能生成图像，请检查模型响应');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('生成失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Save history (Memory only as requested)
  const saveToHistory = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev].slice(0, 50));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedSubCategoryGroup('');
    setSelectedProduct('');
    setTitle('');
    setDescription('');
    setUploadedImage(null);
    setResultImage(null);
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-[#e9e4db] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={resetAll}>
          <div className="bg-[#1a1a1a] p-2.5 rounded-2xl shadow-2xl shadow-black/10">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-[#1a1a1a] uppercase italic">
              Drinkware Studio <span className="text-indigo-600">AI</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 -mt-1">Professional Rendering Suite</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setViewHistory(!viewHistory)}
            className="group flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <History className="w-5 h-5" />
            <span className="hidden sm:inline">创作历程</span>
            {history.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center bg-indigo-600 text-white rounded-full text-[10px] shadow-lg shadow-indigo-200">
                {history.length}
              </span>
            )}
          </button>
          <div className="h-4 w-px bg-slate-200"></div>
          {saasInfo ? (
             <div className="hidden md:flex items-center gap-3">
               <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{saasInfo.userName || 'Account'}</p>
                 <p className="text-sm font-black text-indigo-600">{saasInfo.userIntegral} <span className="text-[10px] text-slate-400">PTS</span></p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
               </div>
             </div>
          ) : (
            <button className="bg-[#1a1a1a] text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
              Upgrade
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 text-slate-900">


        {/* Step Content */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {/* STEP 1: CATEGORY SELECTION */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-3 gap-8"
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as Category);
                      setStep(2);
                    }}
                    className="group relative flex flex-col items-center text-center transition-all bg-white p-8 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-[#e9e4db] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 cursor-pointer"
                  >
                    <div className={`mb-6 p-5 rounded-2xl ${cat.color} group-hover:scale-110 transition-all duration-500`}>
                      <cat.icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight mb-2 text-[#1a1a1a]">{cat.name}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6 px-2 font-medium">定制化生成顶级商业视觉方案。</p>
                    <div className="mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 group-hover:gap-4 transition-all">
                      Select Category <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {/* STEP 2: DETAILS */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Form Side */}
                <div className="lg:col-span-8 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                  <div className="flex items-center gap-2 mb-8 text-slate-400">
                    <button onClick={() => setStep(1)} className="hover:text-indigo-600 flex items-center gap-1 font-medium">
                      <ChevronLeft className="w-4 h-4" /> 返回分类
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Image Upload */}
                    <section>
                      <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-indigo-500" /> 第一步：上传产品原图
                      </label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-[#e9e4db] border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-slate-50 group ${
                          uploadedImage ? 'border-indigo-400 bg-indigo-50/10' : ''
                        }`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          accept="image/*"
                        />
                        {uploadedImage ? (
                          <div className="flex flex-col items-center">
                            <div className="relative">
                              <img src={uploadedImage} alt="Preview" className="max-h-48 rounded-lg shadow-md mb-4" />
                              <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-1 rounded-full">
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                            <p className="text-sm text-indigo-600 font-medium">已成功上传，点击更换</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-4 group-hover:scale-110 transition-transform">
                              <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-slate-600 font-medium tracking-tight">点击上传您的产品图片</p>
                            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-2">JPG, PNG, WEBP (建议透明底图)</p>
                          </div>
                        )}
                      </div>

                      {uploadedImage && (
                        <div className="mt-6 flex justify-center">
                          <button
                            disabled={isAnalyzing}
                            onClick={analyzeProduct}
                            className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-black transition-all shadow-lg active:scale-95 group ${
                              isAnalyzing 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                            }`}
                          >
                            {isAnalyzing ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                正在智能分析中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                开始智能分析并填充
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </section>

                    {/* Product Selection */}
                    <section>
                      <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-500" /> 第二步：选择产品细分
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.keys(SUB_CATEGORIES[selectedCategory!]).map((group) => (
                          <button
                            key={group}
                            onClick={() => {
                              setSelectedSubCategoryGroup(group);
                              setSelectedProduct(group);
                            }}
                            className={`px-4 py-4 rounded-xl text-left transition-all border-2 flex flex-col justify-between ${
                              selectedSubCategoryGroup === group 
                              ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-lg scale-[1.02]' 
                              : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                            }`}
                          >
                            <div className="font-bold text-sm tracking-tight">{group}</div>
                            <div className={`text-[10px] mt-2 leading-tight opacity-60`}>
                              {SUB_CATEGORIES[selectedCategory!][group].slice(0, 3).join('、')}{SUB_CATEGORIES[selectedCategory!][group].length > 3 ? '...' : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Text Details */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <Type className="w-4 h-4 text-indigo-500" /> 标题：
                        </label>
                        <input 
                          type="text" 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="例如: 极致奢盈赋活精华液"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          产品介绍：
                        </label>
                        <textarea 
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="例如: 让肌肤换发自然光彩..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium whitespace-pre-wrap resize-none"
                        />
                      </div>
                    </section>

                    {/* Style & Config */}
                    <section>
                      <label className="block text-sm font-bold text-slate-700 mb-4">生成风格</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {currentStyles.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setActiveStyleId(s.id)}
                            className={`group relative flex items-center justify-center py-4 px-3 rounded-xl border-2 transition-all ${
                              activeStyleId === s.id 
                              ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-500/10' 
                              : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                          >
                            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors text-center ${
                              activeStyleId === s.id ? 'text-indigo-700' : 'text-slate-500'
                            }`}>
                              {s.name}
                            </span>
                            {activeStyleId === s.id && (
                              <div className="absolute top-1 right-1">
                                <div className="bg-indigo-600 rounded-full p-0.5 shadow-sm">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {/* Sidebar Side (Controls) */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-[#e9e4db]">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
                      Output Config
                    </h4>
                    
                    <div className="space-y-10">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resolution</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['1k', '2k', '4k'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setResolution(r)}
                              className={`py-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${
                                resolution === r ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-slate-50 text-slate-300'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Aspect Ratio</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['1:1', '3:4', '4:3', '16:9'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setAspectRatio(r)}
                              className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${
                                aspectRatio === r ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-slate-50 text-slate-300'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6">
                        <button
                          disabled={!uploadedImage || !selectedProduct || isGenerating}
                          onClick={generateImage}
                          className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-2xl ${
                            isGenerating 
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' 
                            : 'bg-[#1a1a1a] text-white hover:bg-indigo-600 shadow-indigo-100'
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Generating...
                            </>
                          ) : (
                            <>
                              Render Poster
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: RESULT */}
            {step === 3 && resultImage && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-white p-6 rounded-[3rem] shadow-2xl border border-[#e9e4db] overflow-hidden">
                  <div className="aspect-square w-full rounded-[2rem] overflow-hidden bg-slate-50 relative group">
                    <img 
                      src={resultImage} 
                      alt="Generated Result" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="py-10 px-4 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight mb-2 uppercase italic">{title || 'Production Poster'}</h2>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{selectedProduct} // STYLE: {currentStyles.find(s => s.id === activeStyleId)?.name}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={resetAll}
                        className="px-8 py-4 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Reset
                      </button>
                      <button 
                        onClick={() => downloadImage(resultImage, `render-${Date.now()}.png`)}
                        className="px-10 py-4 rounded-2xl bg-[#1a1a1a] text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Export
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* History Sidebar / List Overlay */}
      <AnimatePresence>
        {viewHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewHistory(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.1)] z-[70] flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-xl font-black text-[#1a1a1a] tracking-tight">创作历程</h3>
                </div>
                <button 
                  onClick={() => setViewHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                      <Clock className="w-12 h-12" />
                    </div>
                    <p className="text-slate-400 font-medium">暂无历史记录，刷新后会清空哦</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-[#f8f7f4] border border-transparent rounded-[2.5rem] p-5 transition-all hover:bg-white hover:shadow-2xl hover:border-slate-100 cursor-pointer"
                      onClick={() => setPreviewItem(item)}
                    >
                      <div className="aspect-square relative overflow-hidden bg-white shadow-inner rounded-2xl mb-6">
                        <img src={item.url} alt={item.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-black text-xs uppercase tracking-widest mb-1 truncate">{item.title || 'Untitled'}</h4>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-400 font-bold opacity-60 truncate">{item.subCategory}</span>
                             <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md scale-90 origin-left">
                                {item.style}
                             </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(item.url, `ai-design-${item.id}.png`);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistory(prev => prev.filter(h => h.id !== item.id));
                            }}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/95 backdrop-blur-xl"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Image Container - occupies most space */}
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-4">
                <img 
                  src={previewItem.url} 
                  alt={previewItem.title} 
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
                />
              </div>

              {/* Minimalist Fixed Controls */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
                <button 
                  onClick={() => downloadImage(previewItem.url, `ai-design-full-${previewItem.id}.png`)}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-white/20 transition-all shadow-2xl active:scale-95 group"
                >
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" /> 下载图像
                </button>
                <button 
                  onClick={() => setPreviewItem(null)}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-white/20 transition-all shadow-2xl active:scale-95"
                >
                  返回
                </button>
              </div>

              {/* Close button top right */}
              <button 
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 p-4 text-white/30 hover:text-white transition-colors"
                title="关闭"
              >
                <ChevronRight className="w-12 h-12 rotate-180" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto p-20 text-center">
        <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">© 2026 Studio Forge · Gemini 3.1 Neural Engine</p>
      </footer>
    </div>
  );
}
