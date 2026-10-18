// ======================================================
// SUPABASE
// ======================================================

let isResting = false;
const REST_DURATION = 15; // زمن الاستراحة بالثواني

const SUPABASE_URL =
    "https://xfjsbtmhurpszekrbkty.supabase.co";

// مفتاح publishable مخصص للمتصفح بحسب تصميم Supabase، وحمايته تعتمد على RLS.
const SUPABASE_KEY =
    "sb_publishable_g3A0U4T9FDNYKk3aiGPkYg_m_cfz66s";

const AVATAR_BUCKET = "profile-images";

// نسخة واحدة فقط من العميل. لم نغيّر storageKey حتى لا تُفقد الجلسات الحالية.
const supabaseClient =
    window.supabase
        ? window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        )
        : null;

const $ = (id) => document.getElementById(id);


// ======================================================
// بيانات المستخدم
// ======================================================

let currentUser = null;
let currentProfile = null;
let intentionalSignOut = false;


// ======================================================
// صورة البروفايل
// مفتاح التخزين الأصلي محفوظ كما هو، ويضاف له مفتاح مالك الصورة
// ======================================================

const PROFILE_IMAGE_KEY = "myBodyProfileImage";
const PROFILE_IMAGE_OWNER_KEY = "myBodyProfileImageOwner";

let profileImageData = "";

const DEFAULT_PROFILE_IMAGE =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='50' fill='%23666d77'/%3E%3Ccircle cx='50' cy='34' r='18' fill='%23b8bec6'/%3E%3Cpath d='M20 88c3-22 17-34 30-34s27 12 30 34' fill='%23858c96'/%3E%3C/svg%3E";


// ======================================================
// التمارين
// ======================================================

const exercises = {

    upperAbs: [
        { name: "Crunches", emoji: "🧘", description: "استلقِ على ظهرك، اثنِ ركبتيك وارفع الجزء العلوي من جسمك باتجاه الركبتين." },
        { name: "Sit-Ups", emoji: "🧘‍♂️", description: "استلقِ على ظهرك ثم ارفع الجزء العلوي من جسمك ببطء ثم ارجع لوضع البداية." },
        { name: "Toe Touches", emoji: "🙆", description: "استلقِ على ظهرك وارفع ساقيك ثم حاول لمس أصابع القدمين بيديك." }
    ],

    lowerAbs: [
        { name: "Leg Raises", emoji: "🦵", description: "استلقِ على ظهرك وارفع ساقيك معًا للأعلى ثم اخفضهما ببطء." },
        { name: "Reverse Crunches", emoji: "🔄", description: "ارفع الركبتين باتجاه الصدر باستخدام عضلات البطن ثم عد ببطء." },
        { name: "Flutter Kicks", emoji: "🦵", description: "ارفع ساقيك قليلًا عن الأرض وحركهما بالتبادل للأعلى والأسفل." }
    ],

    obliques: [
        { name: "Bicycle Crunches", emoji: "🚴", description: "حرّك الكوع باتجاه الركبة المقابلة بالتبادل مع الحفاظ على التحكم." },
        { name: "Russian Twists", emoji: "🔄", description: "اجلس مع ثني الركبتين ولف الجزء العلوي من جسمك يمينًا ويسارًا." },
        { name: "Side Crunches", emoji: "↔️", description: "استلقِ على جانبك وارفع الجزء العلوي من جسمك باستخدام عضلات الجنب." }
    ],

    upperChest: [
        { name: "Incline Push-Ups", emoji: "💪", description: "ضع يديك على سطح مرتفع وادفع جسمك للأعلى مع الحفاظ على استقامة الجسم." },
        { name: "Wide Push-Ups", emoji: "🙌", description: "ضع يديك أوسع من الكتفين وانزل بجسمك ثم ادفع للأعلى." },
        { name: "Knee Incline Push-Ups", emoji: "🧎", description: "نفّذ تمرين الضغط مع الركبتين على الأرض واليدين على سطح مرتفع." }
    ],

    middleChest: [
        { name: "Push-Ups", emoji: "💪", description: "ضع يديك تحت الكتفين تقريبًا، حافظ على جسم مستقيم وانزل ثم ادفع للأعلى." },
        { name: "Diamond Push-Ups", emoji: "💎", description: "قرّب يديك من بعضهما تحت الصدر ثم انزل وادفع جسمك للأعلى." },
        { name: "Wide Push-Ups", emoji: "🙌", description: "ضع يديك أوسع قليلًا من الكتفين وانزل ثم ادفع للأعلى." }
    ],

    lowerChest: [
        { name: "Decline Push-Ups", emoji: "📐", description: "ضع قدميك على سطح مرتفع ويديك على الأرض ثم نفّذ تمرين الضغط." },
        { name: "Slow Push-Ups", emoji: "🐢", description: "انزل ببطء وتحكم في الحركة ثم ادفع جسمك للأعلى." },
        { name: "Wide Push-Ups", emoji: "🙌", description: "نفّذ الضغط مع وضع اليدين بشكل أوسع من الكتفين." }
    ],

    frontShoulder: [
        { name: "Pike Push-Ups", emoji: "🔺", description: "ارفع الورك للأعلى وحافظ على وضع يشبه حرف V ثم نفّذ الضغط." },
        { name: "Shoulder Taps", emoji: "👋", description: "من وضع الضغط المس كتفك المقابل بالتبادل مع الحفاظ على ثبات الجسم." },
        { name: "Front Arm Raises", emoji: "🙋", description: "ارفع ذراعيك للأمام حتى مستوى الكتفين ثم اخفضهما ببطء." }
    ],

    sideShoulder: [
        { name: "Lateral Raises", emoji: "🙆", description: "ارفع ذراعيك إلى الجانبين حتى مستوى الكتفين ثم اخفضهما ببطء." },
        { name: "Arm Circles", emoji: "🔄", description: "مد ذراعيك إلى الجانبين وقم بعمل دوائر صغيرة ثم أكبر." },
        { name: "Side Plank Reach", emoji: "↗️", description: "من وضع البلانك الجانبي مد ذراعك للأعلى مع الحفاظ على توازن الجسم." }
    ],

    rearShoulder: [
        { name: "Reverse Fly", emoji: "🪽", description: "انحنِ قليلًا للأمام وافتح ذراعيك إلى الجانبين ثم أعدهما ببطء." },
        { name: "Bent Over Raises", emoji: "🙇", description: "انحنِ للأمام وارفع الذراعين للخلف مع التحكم في الحركة." },
        { name: "Reverse Arm Circles", emoji: "🔄", description: "حرّك ذراعيك في دوائر للخلف بشكل متحكم." }
    ],

    quads: [
        { name: "Squats", emoji: "🏋️", description: "قف والقدمان بعرض الكتفين، انزل بالحوض ثم ادفع للأعلى." },
        { name: "Forward Lunges", emoji: "🦵", description: "خذ خطوة للأمام وانزل بالركبة ثم ادفع للعودة إلى وضع البداية." },
        { name: "Wall Sit", emoji: "🧱", description: "اسند ظهرك على الحائط وحافظ على وضع الجلوس." }
    ],

    hamstrings: [
        { name: "Romanian Deadlift", emoji: "🏋️‍♂️", description: "حافظ على الظهر مستقيمًا وادفع الحوض للخلف ثم عد لوضع البداية." },
        { name: "Glute Bridge", emoji: "🌉", description: "استلقِ على ظهرك وارفع الحوض للأعلى ثم اخفضه ببطء." },
        { name: "Single Leg Bridge", emoji: "🦵", description: "ارفع ساقًا للأعلى ثم ارفع الحوض باستخدام الساق الأخرى." }
    ],

    innerThigh: [
        { name: "Sumo Squats", emoji: "🥋", description: "افتح القدمين بشكل واسع ووجّه أصابع القدمين للخارج ثم نفّذ السكوات." },
        { name: "Side Lunges", emoji: "↔️", description: "خذ خطوة واسعة إلى الجانب وانزل على ساق واحدة ثم عد." },
        { name: "Wide Stance Squats", emoji: "🦵", description: "قف بوقفة واسعة ثم انزل ببطء وادفع جسمك للأعلى." }
    ],

    calves: [
        { name: "Calf Raises", emoji: "🦶", description: "قف بشكل مستقيم وارفع كعبيك عن الأرض ثم انزل ببطء." },
        { name: "Single Leg Calf Raises", emoji: "🦶", description: "قف على ساق واحدة وارفع الكعب للأعلى ثم اخفضه ببطء." },
        { name: "Jumping Calf Raises", emoji: "⬆️", description: "ارفع نفسك عن الأرض باستخدام السمانة بحركات خفيفة ومتحكم بها." }
    ],

    // ======================================================
    // تمارين فقدان الوزن
    // ======================================================

    cardio: [
        { name: "الجري في المكان", emoji: "🏃", description: "اركض في مكانك بخطوات سريعة ومنتظمة مع تحريك الذراعين بإيقاع مريح." },
        { name: "Jumping Jacks", emoji: "🤸", description: "اقفز مع فتح القدمين والذراعين للخارج ثم عد إلى وضع البداية بإيقاع ثابت." },
        { name: "High Knees", emoji: "🏃‍♂️", description: "ارفع الركبتين بالتبادل إلى مستوى مريح وبسرعة مناسبة مع تحريك الذراعين." },
        { name: "Mountain Climbers", emoji: "⛰️", description: "من وضع البلانك، اسحب الركبتين بالتبادل نحو الصدر بحركة سريعة ومتحكم بها." },
        { name: "Burpees", emoji: "🔥", description: "انزل للقرفصاء، ضع اليدين على الأرض، ارجع بالقدمين للخلف ثم عد واقفز لأعلى." },
        { name: "Skater Jumps", emoji: "⛸️", description: "تحرك من جانب لآخر بقفزات جانبية قصيرة وحافظ على توازنك عند الهبوط." },
        { name: "Butt Kicks", emoji: "🏃‍♀️", description: "اركض في مكانك مع رفع الكعبين للخلف بالتبادل وبإيقاع ثابت." },
        { name: "Squat Jumps", emoji: "⬆️", description: "انزل إلى قرفصاء مريحة ثم ادفع للأعلى في قفزة خفيفة واهبط بثبات." },
        { name: "Fast Feet", emoji: "⚡", description: "حرّك القدمين بسرعة بخطوات قصيرة ومتتابعة مع إبقاء الجسم متوازنًا." },
        { name: "Shadow Boxing", emoji: "🥊", description: "نفّذ لكمات خفيفة في الهواء بالتبادل مع حركة القدمين في وضع رياضي مريح." }
    ]
};


// ======================================================
// مجموعات العضلات
// ======================================================

const muscleGroups = {

    upper: [
        { id: "upperAbs", name: "البطن العلوية", icon: "🔥" },
        { id: "lowerAbs", name: "البطن السفلية", icon: "⚡" },
        { id: "obliques", name: "جوانب البطن", icon: "💥" },
        { id: "upperChest", name: "الصدر العلوي", icon: "🏋️" },
        { id: "middleChest", name: "الصدر الأوسط", icon: "💪" },
        { id: "lowerChest", name: "الصدر السفلي", icon: "🔥" },
        { id: "frontShoulder", name: "الكتف الأمامي", icon: "⚡" },
        { id: "sideShoulder", name: "الكتف الجانبي", icon: "💪" },
        { id: "rearShoulder", name: "الكتف الخلفي", icon: "🔥" }
    ],

    lower: [
        { id: "quads", name: "الفخذ الأمامي", icon: "🦵" },
        { id: "hamstrings", name: "الفخذ الخلفي", icon: "🔥" },
        { id: "innerThigh", name: "الفخذ الداخلي", icon: "⚡" },
        { id: "calves", name: "السمانة", icon: "🦶" }
    ]
};


// ======================================================
// متغيرات البرنامج
// ======================================================

let selectedMuscles = [];
let selectionMode = "muscle";
let selectedTime = 10;

let workoutExercises = [];
let currentExerciseIndex = 0;

let exerciseTime = 0;
let exerciseRemaining = 0;
let totalRemaining = 0;

let timerInterval = null;
let paused = false;


// ======================================================
// الصفحات
// ======================================================

function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {
            page.classList.remove("active");
        });

    const page = $(pageId);

    if (page) {
        page.classList.add("active");
    }
}


// شاشة حالة (تحميل / خطأ اتصال) بدل الشاشة الفارغة
function showStatus(message, canRetry) {

    const text = $("statusText");
    const retry = $("statusRetryBtn");

    if (text) {
        text.textContent = message;
    }

    if (retry) {
        retry.hidden = !canRetry;
    }

    showPage("statusPage");
}


function setAuthMessage(message) {

    const element = $("authMessage");

    if (element) {
        element.textContent = message;
    }
}


// ======================================================
// صورة البروفايل: التخزين المحلي (مرتبط بصاحب الحساب)
// ======================================================

function readLocalAvatar() {

    try {

        return {
            data: localStorage.getItem(PROFILE_IMAGE_KEY) || "",
            owner: localStorage.getItem(PROFILE_IMAGE_OWNER_KEY) || ""
        };

    } catch (error) {

        return { data: "", owner: "" };
    }
}


function saveLocalAvatar(userId, dataUrl) {

    try {

        localStorage.setItem(PROFILE_IMAGE_KEY, dataUrl);
        localStorage.setItem(PROFILE_IMAGE_OWNER_KEY, userId);

        return true;

    } catch (error) {

        console.error("Profile image storage error:", error);

        return false;
    }
}


// المصدر الأساسي هو Supabase (يتزامن بين الأجهزة).
// النسخة المحلية تُستخدم فقط إن كانت تخص المستخدم الحالي.
function resolveProfileImage() {

    if (currentProfile?.avatar_url) {
        return currentProfile.avatar_url;
    }

    if (currentUser) {

        const local = readLocalAvatar();

        if (local.data && local.owner === currentUser.id) {
            return local.data;
        }
    }

    return "";
}


function setImageSafely(element, source) {

    if (!element) {
        return;
    }

    element.onerror = () => {

        element.onerror = null;

        const local = readLocalAvatar();

        element.src =
            currentUser && local.data && local.owner === currentUser.id
                ? local.data
                : DEFAULT_PROFILE_IMAGE;
    };

    element.src = source || DEFAULT_PROFILE_IMAGE;
}


function updateProfileImageUI() {

    profileImageData = resolveProfileImage();

    setImageSafely($("profileImage"), profileImageData);
    setImageSafely($("profilePreview"), profileImageData);
}


// ======================================================
// رفع صورة البروفايل إلى Supabase
// ======================================================

function prepareAvatar(file, maxSize = 800, quality = 0.85) {

    return new Promise((resolve, reject) => {

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {

            URL.revokeObjectURL(objectUrl);

            let width = image.width;
            let height = image.height;

            if (width > maxSize || height > maxSize) {

                if (width > height) {
                    height = Math.round(height * (maxSize / width));
                    width = maxSize;
                } else {
                    width = Math.round(width * (maxSize / height));
                    height = maxSize;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            canvas.getContext("2d").drawImage(image, 0, 0, width, height);

            const dataUrl = canvas.toDataURL("image/jpeg", quality);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve({ blob, dataUrl });
                    } else {
                        reject(new Error("تعذر معالجة الصورة"));
                    }
                },
                "image/jpeg",
                quality
            );
        };

        image.onerror = () => {

            URL.revokeObjectURL(objectUrl);

            reject(new Error("تعذر قراءة الصورة، جرّب صورة أخرى."));
        };

        image.src = objectUrl;
    });
}


async function removeAvatarFile(publicUrl) {

    try {

        const marker = `/${AVATAR_BUCKET}/`;
        const index = publicUrl.indexOf(marker);

        if (index === -1) {
            return;
        }

        const path =
            decodeURIComponent(
                publicUrl
                    .slice(index + marker.length)
                    .split("?")[0]
            );

        await supabaseClient.storage.from(AVATAR_BUCKET).remove([path]);

    } catch (error) {

        console.warn("Old avatar cleanup skipped:", error);
    }
}


async function uploadAvatar(userId, blob) {

    const path = `${userId}-${Date.now()}.jpg`;

    const { error: uploadError } =
        await supabaseClient.storage
            .from(AVATAR_BUCKET)
            .upload(path, blob, {
                contentType: "image/jpeg",
                cacheControl: "3600"
            });

    if (uploadError) {
        throw uploadError;
    }

    const { data: urlData } =
        supabaseClient.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(path);

    const imageUrl = urlData.publicUrl;

    const { data: rows, error: dbError } =
        await supabaseClient
            .from("profiles")
            .update({ avatar_url: imageUrl })
            .eq("id", userId)
            .select("id");

    if (dbError || !rows || rows.length === 0) {

        await removeAvatarFile(imageUrl);

        throw dbError || new Error("لم يتم العثور على الملف الشخصي");
    }

    const oldUrl = currentProfile?.avatar_url;

    currentProfile = {
        ...(currentProfile || { id: userId }),
        avatar_url: imageUrl
    };

    if (oldUrl && oldUrl !== imageUrl) {
        removeAvatarFile(oldUrl);
    }

    return imageUrl;
}


async function handleProfileImageChange(event) {

    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        alert("اختار صورة فقط");

        input.value = "";

        return;
    }

    if (!currentUser || !supabaseClient) {

        alert("يجب تسجيل الدخول أولاً");

        input.value = "";

        return;
    }

    const userId = currentUser.id;

    let prepared;

    try {

        prepared = await prepareAvatar(file);

    } catch (error) {

        alert(error.message);

        input.value = "";

        return;
    }

    input.value = "";

    try {

        await uploadAvatar(userId, prepared.blob);

        saveLocalAvatar(userId, prepared.dataUrl);

        if (currentUser && currentUser.id === userId) {

            updateProfileImageUI();

            const modal = $("profileModal");

            if (modal) {
                modal.hidden = true;
            }
        }

        alert("تم رفع الصورة وحفظها في الحساب بنجاح! 🔥");

    } catch (error) {

        console.error("خطأ أثناء رفع الصورة:", error);

        // فشل الرفع لا يعطّل التطبيق. نحتفظ بنسخة محلية إن لم تكن هناك صورة محفوظة في الحساب.
        if (
            !currentProfile?.avatar_url &&
            saveLocalAvatar(userId, prepared.dataUrl)
        ) {

            updateProfileImageUI();

            alert(
                "تعذر رفع الصورة إلى حسابك، وتم حفظها على هذا الجهاز فقط: " +
                error.message
            );

        } else {

            alert(
                "حدث خطأ أثناء رفع الصورة: " +
                error.message
            );
        }
    }
}


// ترحيل صورة قديمة محفوظة محليًا قبل نظام الحسابات (بدون مالك) دون فقدانها
function migrateLegacyAvatar() {

    if (!currentUser || !supabaseClient) {
        return;
    }

    const local = readLocalAvatar();

    if (!local.data || local.owner || currentProfile?.avatar_url) {
        return;
    }

    const userId = currentUser.id;

    try {
        localStorage.setItem(PROFILE_IMAGE_OWNER_KEY, userId);
    } catch (error) {
        return;
    }

    (async () => {

        try {

            const blob = await (await fetch(local.data)).blob();

            await uploadAvatar(userId, blob);

            if (currentUser && currentUser.id === userId) {
                updateProfileImageUI();
            }

        } catch (error) {

            console.warn("Legacy avatar upload skipped:", error);
        }
    })();
}


function setupProfileButton() {

    const profileButton = $("profileImageButton");

    if (!profileButton) {
        return;
    }

    profileButton.addEventListener(
        "click",
        () => {

            const modal = $("profileModal");

            if (modal) {
                modal.hidden = false;
            }

            setImageSafely($("profilePreview"), profileImageData);
        }
    );

    const closeButton = $("closeProfileModal");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                const modal = $("profileModal");

                if (modal) {
                    modal.hidden = true;
                }
            }
        );
    }

    const input = $("profileImageInput");

    const uploadButton =
        document.querySelector(".profile-upload-button");

    if (uploadButton && input) {

        uploadButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                input.click();
            }
        );
    }

    // مستمع واحد فقط لتغيير الصورة
    if (input) {

        input.addEventListener(
            "change",
            handleProfileImageChange
        );
    }

    const logoutButton = $("logoutBtn");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );
    }
}


// ======================================================
// بيانات الجسم
// ======================================================

async function saveBodyData() {

    if (!currentUser || !supabaseClient) {

        showBodyDataMessage(
            "يجب تسجيل الدخول أولاً"
        );

        return;
    }

    const height = Number($("heightInput")?.value);
    const weight = Number($("weightInput")?.value);
    const age = Number($("ageInput")?.value);

    if (!height || !weight || !age) {

        showBodyDataMessage(
            "اكتب الطول والوزن والعمر بالكامل"
        );

        return;
    }

    if (height < 50 || height > 250) {

        showBodyDataMessage("الطول غير صحيح");

        return;
    }

    if (weight < 10 || weight > 500) {

        showBodyDataMessage("الوزن غير صحيح");

        return;
    }

    if (age < 1 || age > 120) {

        showBodyDataMessage("العمر غير صحيح");

        return;
    }

    const button = $("saveBodyDataBtn");

    if (button) {

        button.disabled = true;

        button.textContent = "جاري الحفظ...";
    }

    try {

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .upsert(
                    {
                        id: currentUser.id,

                        name:
                            currentProfile?.name ||
                            currentUser.user_metadata?.name ||
                            "",

                        height,
                        weight,
                        age
                    },
                    {
                        onConflict: "id"
                    }
                )
                .select()
                .single();

        if (error) {
            throw error;
        }

        currentProfile = data;

        updateHomeProfile();
        updateProfileImageUI();

        showPage("homePage");

        showBodyDataMessage("");

    } catch (error) {

        console.error("Save body data error:", error);

        showBodyDataMessage(
            "حدث خطأ أثناء حفظ البيانات: " +
            error.message
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent = "حفظ البيانات";
        }
    }
}


function showBodyDataMessage(message) {

    const messageElement = $("bodyDataMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }
}


function openBodyDataPage() {

    const height = $("heightInput");
    const weight = $("weightInput");
    const age = $("ageInput");

    if (height) {
        height.value = currentProfile?.height ?? "";
    }

    if (weight) {
        weight.value = currentProfile?.weight ?? "";
    }

    if (age) {
        age.value = currentProfile?.age ?? "";
    }

    showPage("bodyDataPage");
}


// ======================================================
// جلب بيانات المستخدم
// يميّز بين "فشل التحميل" و "لا يوجد ملف شخصي"
// ======================================================

async function loadProfile(userId) {

    try {

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

        if (error) {

            console.error("Profile error:", error);

            return { profile: null, error };
        }

        return { profile: data, error: null };

    } catch (error) {

        console.error("Profile error:", error);

        return { profile: null, error };
    }
}


// ينشئ صف الملف الشخصي إن لم يكن موجودًا، دون الكتابة فوق أي صف موجود.
// فشله لا يعطّل التطبيق ولا يسجّل الخروج.
async function ensureProfile(name) {

    const stub = {
        id: currentUser.id,
        name: name || ""
    };

    try {

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .insert(stub)
                .select()
                .maybeSingle();

        if (error) {
            throw error;
        }

        return data || stub;

    } catch (error) {

        console.error("Profile create error:", error);

        return stub;
    }
}


function profileComplete(profile) {

    return (
        profile &&
        profile.height !== null &&
        profile.height !== undefined &&
        profile.weight !== null &&
        profile.weight !== undefined &&
        profile.age !== null &&
        profile.age !== undefined
    );
}


// ======================================================
// تحديث الرئيسية
// ======================================================

function updateHomeProfile() {

    if (!currentProfile) {
        return;
    }

    const userName = $("userName");
    const userWeight = $("userWeight");
    const userHeight = $("userHeight");
    const userAge = $("userAge");

    if (userName) {

        userName.textContent =
            currentProfile.name ||
            currentUser?.user_metadata?.name ||
            "...";
    }

    if (userWeight) {
        userWeight.textContent = currentProfile.weight ?? "--";
    }

    if (userHeight) {
        userHeight.textContent = currentProfile.height ?? "--";
    }

    if (userAge) {
        userAge.textContent = currentProfile.age ?? "--";
    }
}


// ======================================================
// بناء العضلات
// ======================================================

const startWorkoutBtn = $("startWorkoutBtn");

if (startWorkoutBtn) {

    startWorkoutBtn.addEventListener(
        "click",
        () => {

            selectionMode = "muscle";

            showPage("bodyPage");
        }
    );
}


// ======================================================
// فقدان الوزن
// ======================================================

const weightLossBtn = $("weightLossBtn");

if (weightLossBtn) {

    weightLossBtn.addEventListener(
        "click",
        openCardioExercises
    );
}


// ======================================================
// تمارين فقدان الوزن
// نفس نظام بناء العضلات
// ======================================================

function openCardioExercises() {

    const container = $("musclesContainer");

    if (!container) {
        return;
    }

    selectionMode = "cardio";

    selectedMuscles = [];

    container.innerHTML = "";

    const title = $("musclesTitle");

    if (title) {
        title.textContent = "اختر تمارين التخسيس";
    }

    const counterLabel =
        document.querySelector(
            "#musclesPage .selected-counter span"
        );

    if (counterLabel) {
        counterLabel.textContent = "التمارين المختارة";
    }

    exercises.cardio.forEach(
        (exercise, index) => {

            const card = document.createElement("div");

            const cardioId = `cardio-${index}`;

            card.className = "muscle-card";

            card.innerHTML = `

                <div class="muscle-info">

                    <span class="muscle-icon">
                        ${exercise.emoji}
                    </span>

                    <div>

                        <h3>
                            ${exercise.name}
                        </h3>

                        <small>
                            ${exercise.description}
                        </small>

                    </div>

                </div>

                <label class="muscle-checkbox">

                    <input
                        type="checkbox"
                        value="${cardioId}"
                    >

                    <span></span>

                </label>

            `;

            const checkbox = card.querySelector("input");

            checkbox.addEventListener(
                "change",
                () => {

                    if (checkbox.checked) {

                        selectedMuscles.push(cardioId);

                        card.classList.add("selected");

                    } else {

                        selectedMuscles =
                            selectedMuscles.filter(
                                id => id !== cardioId
                            );

                        card.classList.remove("selected");
                    }

                    updateSelectedCount();
                }
            );

            container.appendChild(card);
        }
    );

    updateSelectedCount();

    showPage("musclesPage");
}


// ======================================================
// الرجوع للرئيسية
// ======================================================

const backToHome = $("backToHome");

if (backToHome) {

    backToHome.addEventListener(
        "click",
        () => {

            selectionMode = "muscle";

            showPage("homePage");
        }
    );
}


// ======================================================
// الجزء العلوي / السفلي
// ======================================================

const upperBodyBtn = $("upperBodyBtn");

if (upperBodyBtn) {

    upperBodyBtn.addEventListener(
        "click",
        () => {
            openMuscles("upper");
        }
    );
}

const lowerBodyBtn = $("lowerBodyBtn");

if (lowerBodyBtn) {

    lowerBodyBtn.addEventListener(
        "click",
        () => {
            openMuscles("lower");
        }
    );
}


// ======================================================
// فتح العضلات
// ======================================================

function openMuscles(type) {

    selectionMode = "muscle";

    const container = $("musclesContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    selectedMuscles = [];

    const title = $("musclesTitle");

    if (title) {

        title.textContent =
            type === "upper"
                ? "الجزء العلوي"
                : "الجزء السفلي";
    }

    const counterLabel =
        document.querySelector(
            "#musclesPage .selected-counter span"
        );

    if (counterLabel) {
        counterLabel.textContent = "العضلات المختارة";
    }

    muscleGroups[type].forEach(
        muscle => {

            const card = document.createElement("div");

            card.className = "muscle-card";

            card.innerHTML = `

                <div class="muscle-info">

                    <span class="muscle-icon">
                        ${muscle.icon}
                    </span>

                    <div>

                        <h3>
                            ${muscle.name}
                        </h3>

                        <small>
                            ${exercises[muscle.id].length}
                            تمارين
                        </small>

                    </div>

                </div>

                <label class="muscle-checkbox">

                    <input
                        type="checkbox"
                        value="${muscle.id}"
                    >

                    <span></span>

                </label>

            `;

            const checkbox = card.querySelector("input");

            checkbox.addEventListener(
                "change",
                () => {

                    if (checkbox.checked) {

                        selectedMuscles.push(muscle.id);

                        card.classList.add("selected");

                    } else {

                        selectedMuscles =
                            selectedMuscles.filter(
                                id => id !== muscle.id
                            );

                        card.classList.remove("selected");
                    }

                    updateSelectedCount();
                }
            );

            container.appendChild(card);
        }
    );

    updateSelectedCount();

    showPage("musclesPage");
}


// ======================================================
// عدد الاختيارات
// ======================================================

function updateSelectedCount() {

    const count = $("selectedCount");

    if (count) {
        count.textContent = selectedMuscles.length;
    }
}


// ======================================================
// الرجوع من العضلات
// ======================================================

const backToBody = $("backToBody");

if (backToBody) {

    backToBody.addEventListener(
        "click",
        () => {

            if (selectionMode === "cardio") {
                showPage("homePage");
            } else {
                showPage("bodyPage");
            }
        }
    );
}


// ======================================================
// الانتقال للوقت
// ======================================================

const continueToTime = $("continueToTime");

if (continueToTime) {

    continueToTime.addEventListener(
        "click",
        () => {

            if (selectedMuscles.length === 0) {

                alert(
                    selectionMode === "cardio"
                        ? "اختار تمرين واحد على الأقل 🔥"
                        : "اختار عضلة واحدة على الأقل 💪"
                );

                return;
            }

            showPage("timePage");
        }
    );
}


// ======================================================
// اختيار الوقت
// ======================================================

const timeOptions =
    document.querySelectorAll(".time-option");

timeOptions.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                timeOptions.forEach(
                    btn => {
                        btn.classList.remove("active-time");
                    }
                );

                button.classList.add("active-time");

                selectedTime = Number(button.dataset.time);

                const display = $("selectedTimeDisplay");

                if (display) {
                    display.textContent = `${selectedTime} دقائق`;
                }
            }
        );
    }
);


// ======================================================
// رجوع من الوقت
// ======================================================

const backToMuscles = $("backToMuscles");

if (backToMuscles) {

    backToMuscles.addEventListener(
        "click",
        () => {
            showPage("musclesPage");
        }
    );
}


// ======================================================
// إنشاء التمرين
// ======================================================

function createWorkout() {

    workoutExercises = [];

    selectedMuscles.forEach(
        muscleId => {

            if (selectionMode === "cardio") {

                const index =
                    Number(muscleId.replace("cardio-", ""));

                const exercise = exercises.cardio[index];

                if (exercise) {

                    workoutExercises.push({
                        muscle: "cardio",
                        name: exercise.name,
                        emoji: exercise.emoji,
                        description: exercise.description
                    });
                }

                return;
            }

            if (exercises[muscleId]) {

                exercises[muscleId].forEach(
                    exercise => {

                        workoutExercises.push({
                            muscle: muscleId,
                            name: exercise.name,
                            emoji: exercise.emoji,
                            description: exercise.description
                        });
                    }
                );
            }
        }
    );

    workoutExercises = shuffleArray(workoutExercises);

    totalRemaining = selectedTime * 60;

    exerciseTime =
        Math.floor(
            totalRemaining / workoutExercises.length
        );

    if (exerciseTime < 1) {
        exerciseTime = 1;
    }
}


// ======================================================
// خلط التمارين
// ======================================================

function shuffleArray(array) {

    const newArray = [...array];

    for (let i = newArray.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [newArray[i], newArray[j]] =
            [newArray[j], newArray[i]];
    }

    return newArray;
}


// ======================================================
// بدء التمرين
// ======================================================

const startExercisesBtn = $("startExercisesBtn");

if (startExercisesBtn) {

    startExercisesBtn.addEventListener(
        "click",
        () => {

            createWorkout();

            if (workoutExercises.length === 0) {

                alert("لم يتم اختيار تمارين");

                return;
            }

            currentExerciseIndex = 0;

            startCurrentExercise();

            showPage("exercisePage");
        }
    );
}


// ======================================================
// التمرين الحالي
// ======================================================

function startCurrentExercise() {

    clearInterval(timerInterval);

    paused = false;

    const current = workoutExercises[currentExerciseIndex];

    if (!current) {

        finishWorkout();

        return;
    }

    exerciseRemaining = exerciseTime;

    const number = $("currentExerciseNumber");

    if (number) {
        number.textContent = currentExerciseIndex + 1;
    }

    const total = $("totalExercises");

    if (total) {
        total.textContent = workoutExercises.length;
    }

    const name = $("exerciseName");

    if (name) {
        name.textContent = current.name;
    }

    const muscle = $("currentMuscle");

    if (muscle) {
        muscle.textContent = getMuscleName(current.muscle);
    }

    let emoji = $("exerciseEmoji");

    if (!emoji) {

        emoji = document.createElement("div");

        emoji.id = "exerciseEmoji";

        emoji.className = "exercise-emoji";

        if (name) {
            name.parentNode.insertBefore(emoji, name);
        }
    }

    emoji.textContent = current.emoji;

    let description = $("exerciseDescription");

    if (!description) {

        description = document.createElement("p");

        description.id = "exerciseDescription";

        description.className = "exercise-description";

        if (name) {
            name.insertAdjacentElement("afterend", description);
        }
    }

    description.textContent = current.description;

    updateExerciseDisplay();

    timerInterval =
        setInterval(
            () => {

                if (paused) {
                    return;
                }

                exerciseRemaining--;

                totalRemaining--;

                updateExerciseDisplay();

                if (exerciseRemaining <= 0) {
                    nextExercise();
                }

                if (totalRemaining <= 0) {
                    finishWorkout();
                }
            },
            1000
        );
}


// ======================================================
// اسم العضلة / نوع التمرين
// ======================================================

function getMuscleName(id) {

    if (id === "cardio") {
        return "تمرين تخسيس";
    }

    const allMuscles = [
        ...muscleGroups.upper,
        ...muscleGroups.lower
    ];

    const muscle = allMuscles.find(item => item.id === id);

    return muscle ? muscle.name : "تمرين";
}


// ======================================================
// تحديث شاشة التمرين
// ======================================================

function updateExerciseDisplay() {

    const timer = $("exerciseTimer");

    if (timer) {
        timer.textContent = formatTime(exerciseRemaining);
    }

    const total = $("totalTimeRemaining");

    if (total) {
        total.textContent =
            formatTime(Math.max(totalRemaining, 0));
    }

    const progress =
        ((exerciseTime - exerciseRemaining) / exerciseTime) * 100;

    const progressBar = $("exerciseProgress");

    if (progressBar) {

        progressBar.style.width =
            `${Math.min(Math.max(progress, 0), 100)}%`;
    }

    const percentage = $("progressPercentage");

    if (percentage) {
        percentage.textContent = `${Math.floor(progress)}%`;
    }
}


// ======================================================
// تنسيق الوقت
// ======================================================

function formatTime(seconds) {

    seconds = Math.max(0, seconds);

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}


// ======================================================
// التمرين التالي
// ======================================================

function nextExercise() {

    currentExerciseIndex++;

    if (currentExerciseIndex >= workoutExercises.length) {

        finishWorkout();

        return;
    }

    startCurrentExercise();
}


// ======================================================
// تخطي
// ======================================================

const skipExerciseBtn = $("skipExerciseBtn");

if (skipExerciseBtn) {

    skipExerciseBtn.addEventListener(
        "click",
        () => {
            nextExercise();
        }
    );
}


// ======================================================
// إيقاف مؤقت
// ======================================================

const pauseExerciseBtn = $("pauseExerciseBtn");

if (pauseExerciseBtn) {

    pauseExerciseBtn.addEventListener(
        "click",
        function () {

            paused = !paused;

            this.textContent =
                paused
                    ? "استكمال ▶"
                    : "إيقاف مؤقت";
        }
    );
}


// ======================================================
// انتهاء التمرين
// ======================================================

function finishWorkout() {

    clearInterval(timerInterval);

    totalRemaining = 0;

    const finalTime = $("finalTime");

    if (finalTime) {
        finalTime.textContent = `${selectedTime} دقيقة`;
    }

    const finalExercises = $("finalExercises");

    if (finalExercises) {
        finalExercises.textContent = workoutExercises.length;
    }

    showPage("completePage");
}


// ======================================================
// تمرين جديد
// ======================================================

const backToStart = $("backToStart");

if (backToStart) {

    backToStart.addEventListener(
        "click",
        () => {

            clearInterval(timerInterval);

            selectedMuscles = [];

            workoutExercises = [];

            currentExerciseIndex = 0;

            selectedTime = 10;

            selectionMode = "muscle";

            timeOptions.forEach(
                button => {
                    button.classList.remove("active-time");
                }
            );

            const defaultTime =
                document.querySelector('[data-time="10"]');

            if (defaultTime) {
                defaultTime.classList.add("active-time");
            }

            const display = $("selectedTimeDisplay");

            if (display) {
                display.textContent = "10 دقائق";
            }

            showPage("homePage");
        }
    );
}


// ======================================================
// حالة التطبيق عند الدخول / الخروج
// ======================================================

function resetAppState() {

    clearInterval(timerInterval);

    currentUser = null;
    currentProfile = null;
    profileImageData = "";

    selectedMuscles = [];
    workoutExercises = [];
    currentExerciseIndex = 0;

    const modal = $("profileModal");

    if (modal) {
        modal.hidden = true;
    }

    const userName = $("userName");

    if (userName) {
        userName.textContent = "...";
    }

    ["userWeight", "userHeight", "userAge"].forEach(
        id => {

            const element = $(id);

            if (element) {
                element.textContent = "--";
            }
        }
    );

    ["authPassword", "heightInput", "weightInput", "ageInput"].forEach(
        id => {

            const element = $(id);

            if (element) {
                element.value = "";
            }
        }
    );

    showBodyDataMessage("");

    setImageSafely($("profileImage"), "");
    setImageSafely($("profilePreview"), "");
}


// يحدد وجهة المستخدم بعد تسجيل الدخول أو استعادة الجلسة.
// فشل تحميل البيانات لا يعني أن المستخدم غير مسجّل: لا نسجّل خروجه ولا نعرض شاشة فارغة.
async function routeAfterLogin() {

    if (!currentUser || !supabaseClient) {
        return;
    }

    const { profile, error } = await loadProfile(currentUser.id);

    if (error) {

        showStatus(
            "تعذّر تحميل بياناتك الآن. حسابك ما زال مسجّلًا، تحقّق من الاتصال ثم أعد المحاولة.",
            true
        );

        return;
    }

    currentProfile =
        profile ||
        await ensureProfile(currentUser.user_metadata?.name);

    migrateLegacyAvatar();

    updateProfileImageUI();

    if (profileComplete(currentProfile)) {

        updateHomeProfile();

        showPage("homePage");

    } else {

        openBodyDataPage();
    }
}


// تسجيل الخروج المقصود: على هذا الجهاز فقط (scope: local)
// حتى لا تُلغى جلسات الأجهزة أو التطبيقات الأخرى لنفس الحساب.
async function handleLogout() {

    const button = $("logoutBtn");

    if (button) {
        button.disabled = true;
    }

    intentionalSignOut = true;

    try {

        if (supabaseClient) {
            await supabaseClient.auth.signOut({ scope: "local" });
        }

    } catch (error) {

        console.error("Sign out error:", error);
    }

    resetAppState();

    setAuthMessage("");

    showPage("authPage");

    intentionalSignOut = false;

    if (button) {
        button.disabled = false;
    }
}


function handleSignedOut() {

    if (intentionalSignOut) {
        return;
    }

    const wasLoggedIn = !!currentUser;

    if (!wasLoggedIn) {
        return;
    }

    resetAppState();

    setAuthMessage("انتهت جلستك. سجّل الدخول من جديد.");

    showPage("authPage");
}


// ======================================================
// AUTH
// ======================================================

function setupAuth() {

    const authPage = $("authPage");

    if (!authPage) {
        return;
    }

    const nameInput = $("authName");
    const emailInput = $("authEmail");
    const passwordInput = $("authPassword");
    const nameGroup = $("nameGroup");
    const authButton = $("authButton");
    const switchButton = $("authSwitch");
    const authTitle = $("authTitle");

    let signupMode = true;

    const showAuthMessage = setAuthMessage;

    if (authButton) {

        authButton.addEventListener(
            "click",
            async () => {

                const name = nameInput?.value.trim();
                const email = emailInput?.value.trim();
                const password = passwordInput?.value;

                showAuthMessage("");

                if (!supabaseClient) {

                    showAuthMessage(
                        "تعذّر تحميل مكتبة الاتصال. تحقّق من الإنترنت ثم أعد تحميل الصفحة."
                    );

                    return;
                }

                if (signupMode && !name) {

                    showAuthMessage("اكتب اسمك أولاً");

                    return;
                }

                if (!email) {

                    showAuthMessage("اكتب البريد الإلكتروني");

                    return;
                }

                if (!password) {

                    showAuthMessage("اكتب كلمة المرور");

                    return;
                }

                if (password.length < 6) {

                    showAuthMessage(
                        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
                    );

                    return;
                }

                authButton.disabled = true;

                authButton.textContent = "جاري التحميل...";

                try {

                    if (signupMode) {

                        const options = { data: { name } };

                        if (/^https?:$/.test(window.location.protocol)) {
                            options.emailRedirectTo = window.location.origin;
                        }

                        const { data, error } =
                            await supabaseClient
                                .auth
                                .signUp({ email, password, options });

                        if (error) {
                            throw error;
                        }

                        if (!data?.user) {
                            throw new Error("لم يتم إنشاء الحساب");
                        }

                        // عند تفعيل تأكيد البريد، يعيد Supabase مستخدمًا بدون هويات إن كان البريد مسجّلًا
                        if (
                            Array.isArray(data.user.identities) &&
                            data.user.identities.length === 0
                        ) {
                            throw new Error("User already registered");
                        }

                        if (data.session) {

                            // الجلسة موجودة، فالكتابة في profiles مسموحة بسياسات RLS
                            currentUser = data.user;

                            passwordInput.value = "";

                            await routeAfterLogin();

                            return;
                        }

                        // لا توجد جلسة = تأكيد البريد مفعّل. لا نكتب في profiles الآن (لا هوية بعد)،
                        // وسيُنشأ الملف الشخصي تلقائيًا عند أول تسجيل دخول.
                        showAuthMessage(
                            "تم إنشاء الحساب. إن وصلتك رسالة تأكيد على بريدك فافتحها، ثم سجّل الدخول."
                        );

                        return;
                    }

                    const { data, error } =
                        await supabaseClient
                            .auth
                            .signInWithPassword({ email, password });

                    if (error) {
                        throw error;
                    }

                    if (!data?.user) {
                        throw new Error("تعذر تسجيل الدخول");
                    }

                    currentUser = data.user;

                    passwordInput.value = "";

                    await routeAfterLogin();

                } catch (error) {

                    console.error("Auth error:", error);

                    let message =
                        error?.message ||
                        "حدث خطأ غير معروف";

                    const lowerMessage = message.toLowerCase();

                    if (lowerMessage.includes("invalid login credentials")) {

                        message = "البريد الإلكتروني أو كلمة المرور غير صحيحة";

                    } else if (lowerMessage.includes("user already registered")) {

                        message = "هذا البريد الإلكتروني مسجل بالفعل";

                    } else if (lowerMessage.includes("email signups are disabled")) {

                        message = "تسجيل البريد الإلكتروني غير مفعّل في Supabase";

                    } else if (lowerMessage.includes("invalid email")) {

                        message = "البريد الإلكتروني غير صحيح";

                    } else if (lowerMessage.includes("email not confirmed")) {

                        message = "يجب تأكيد بريدك الإلكتروني أولاً. افتح الرسالة المرسلة إليك ثم سجّل الدخول.";

                    } else if (lowerMessage.includes("rate limit")) {

                        message = "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة";

                    } else if (
                        lowerMessage.includes("failed to fetch") ||
                        lowerMessage.includes("networkerror") ||
                        lowerMessage.includes("network request failed") ||
                        lowerMessage.includes("load failed")
                    ) {

                        message = "تعذّر الاتصال بالإنترنت، تحقّق من الاتصال وأعد المحاولة";
                    }

                    showAuthMessage(message);

                } finally {

                    authButton.disabled = false;

                    authButton.textContent =
                        signupMode
                            ? "إنشاء الحساب"
                            : "تسجيل الدخول";
                }
            }
        );
    }

    if (switchButton) {

        switchButton.addEventListener(
            "click",
            () => {

                signupMode = !signupMode;

                if (nameGroup) {
                    nameGroup.style.display = signupMode ? "" : "none";
                }

                if (authTitle) {
                    authTitle.textContent =
                        signupMode
                            ? "إنشاء حساب"
                            : "تسجيل الدخول";
                }

                const description =
                    authPage.querySelector(".auth-description");

                if (description) {

                    description.textContent =
                        signupMode
                            ? "أنشئ حسابك وابدأ رحلتك الرياضية."
                            : "سجّل الدخول إلى حسابك واستكمل رحلتك.";
                }

                if (authButton) {

                    authButton.textContent =
                        signupMode
                            ? "إنشاء الحساب"
                            : "تسجيل الدخول";
                }

                switchButton.textContent =
                    signupMode
                        ? "عندك حساب بالفعل؟ تسجيل الدخول"
                        : "ليس لديك حساب؟ إنشاء حساب";

                if (passwordInput) {

                    passwordInput.autocomplete =
                        signupMode
                            ? "new-password"
                            : "current-password";
                }

                showAuthMessage("");
            }
        );
    }
}


// ======================================================
// أزرار الصفحة
// ======================================================

const saveBodyDataBtn = $("saveBodyDataBtn");

if (saveBodyDataBtn) {
    saveBodyDataBtn.addEventListener("click", saveBodyData);
}

const editBodyDataBtn = $("editBodyDataBtn");

if (editBodyDataBtn) {
    editBodyDataBtn.addEventListener("click", openBodyDataPage);
}

const statusRetryBtn = $("statusRetryBtn");

if (statusRetryBtn) {
    statusRetryBtn.addEventListener("click", initializeApp);
}


// ======================================================
// مراقبة حالة المصادقة (مستمع واحد فقط)
// لا نستدعي Supabase داخل هذه الدالة مباشرة لتجنّب التعارضات
// ======================================================

if (supabaseClient) {

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            if (session && session.user) {

                currentUser = session.user;

            } else if (event === "SIGNED_OUT") {

                // يحدث عند الخروج من تبويب آخر أو عند فشل تجديد الجلسة نهائيًا
                setTimeout(handleSignedOut, 0);
            }
        }
    );
}


// عودة الإنترنت أثناء ظهور شاشة الخطأ: أعد المحاولة تلقائيًا
window.addEventListener(
    "online",
    () => {

        const status = $("statusPage");
        const retry = $("statusRetryBtn");

        if (
            status &&
            status.classList.contains("active") &&
            retry &&
            !retry.hidden
        ) {
            initializeApp();
        }
    }
);


// ======================================================
// تشغيل التطبيق
// ======================================================

async function initializeApp() {

    showStatus("جاري التحميل...", false);

    if (!supabaseClient) {

        showStatus(
            "تعذّر تحميل مكتبة الاتصال. تحقّق من الإنترنت ثم أعد المحاولة.",
            true
        );

        return;
    }

    let session = null;

    try {

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        session = data.session;

    } catch (error) {

        // خطأ في القراءة/التجديد لا يعني أن المستخدم غير مسجّل
        console.error("getSession error:", error);

        showStatus(
            "تعذّر الاتصال الآن. تحقّق من الإنترنت ثم أعد المحاولة.",
            true
        );

        return;
    }

    if (session && session.user) {

        currentUser = session.user;

        await routeAfterLogin();

    } else {

        showPage("authPage");
    }
}


// ======================================================
// بدء التطبيق
// ======================================================

setupProfileButton();

setupAuth();

initializeApp();
