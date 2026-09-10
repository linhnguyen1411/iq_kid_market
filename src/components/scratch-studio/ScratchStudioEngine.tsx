import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Blockly from 'blockly';
import { 
  Play, Square, RotateCcw, Award, Sparkles, ArrowLeft, 
  Layers, Code2, Download, Upload, CheckCircle2, Flag, 
  HelpCircle, Trash2, Maximize2, Save, Copy, ChevronDown,
  Check, Loader2, FileDown, FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ScratchStage, { SpriteState, STAGE_WIDTH, STAGE_HEIGHT } from './ScratchStage';
import { 
  registerScratchBlocks, 
  SCRATCH_TOOLBOX_XML, 
  STARTER_FLAG_SCRIPT_XML 
} from './scratchBlocks';
import { playSynthSound, getAudioContext } from '../game-engines/soundUtils';
import { api } from '../../services/api';
import { ScratchProject } from '../../types';

export interface ScratchTelemetry {
  has_run: boolean;
  final_state: SpriteState;
  variables?: Record<string, number>;
  actions: {
    total_steps: number;
    total_turns: number;
    messages_said: string[];
    sounds_played: string[];
    messages_broadcasted?: string[];
  };
}

export interface ScratchStudioEngineProps {
  lesson?: {
    lesson_num: number;
    title: string;
    content: string;
    target_block_sequence?: string | string[];
    start_scene_json?: string | any;
    xp_reward?: number;
  };
  onLessonComplete?: (submittedPayload: any) => void;
  onBack?: () => void;
  isSandboxMode?: boolean;
  initialProjectId?: string | null;
  onProjectChange?: (project: ScratchProject) => void;
}

const INITIAL_SPRITE_STATE: SpriteState = {
  x: 0,
  y: 0,
  direction: 90, // Nhìn sang phải
  size: 100,
  visible: true,
  speechBubble: null,
};

export default function ScratchStudioEngine({
  lesson,
  onLessonComplete,
  onBack,
  isSandboxMode = false,
  initialProjectId = null,
  onProjectChange,
}: ScratchStudioEngineProps) {
  const blocklyDivRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const [sprite, setSprite] = useState<SpriteState>(INITIAL_SPRITE_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'guide'>('code');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mobileStudioTab, setMobileStudioTab] = useState<'workspace' | 'stage'>('workspace');

  const handleSwitchMobileTab = (tab: 'workspace' | 'stage') => {
    setMobileStudioTab(tab);
    if (tab === 'workspace') {
      setTimeout(() => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
        }
      }, 100);
    }
  };

  // Trạng thái Quản lý Dự Án & Tự Động Lưu (Phase 6)
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [projectTitle, setProjectTitle] = useState<string>('Dự Án Scratch Của Bé');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentProjectIdRef = useRef<string | null>(initialProjectId || null);
  const projectTitleRef = useRef<string>(projectTitle);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Đồng bộ refs
  useEffect(() => {
    projectTitleRef.current = projectTitle;
  }, [projectTitle]);

  useEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  // Tham chiếu telemetry theo dõi vận hành thời gian thực cho Semantic Evaluator
  const variablesRef = useRef<Record<string, number>>({});
  const telemetryRef = useRef<ScratchTelemetry>({
    has_run: false,
    final_state: INITIAL_SPRITE_STATE,
    variables: {},
    actions: {
      total_steps: 0,
      total_turns: 0,
      messages_said: [],
      sounds_played: [],
      messages_broadcasted: [],
    },
  });

  // Tham chiếu để hủy vòng lặp ngay khi bấm nút Đỏ
  const isCancelledRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const currentSpriteRef = useRef<SpriteState>(INITIAL_SPRITE_STATE);

  // Luôn đồng bộ currentSpriteRef với state
  useEffect(() => {
    currentSpriteRef.current = sprite;
  }, [sprite]);

  // Nạp kịch bản XML vào Blockly Workspace
  const loadWorkspaceXml = useCallback((xmlText: string) => {
    const ws = workspaceRef.current;
    if (!ws || !xmlText) return;
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xmlText);
      Blockly.Xml.domToWorkspace(dom, ws);
      Blockly.svgResize(ws);
    } catch (err) {
      console.warn('[ScratchStudio] Không thể nạp XML:', err);
    }
  }, []);

  // Tuần tự hóa toàn bộ cấu trúc dự án hiện tại
  const serializeCurrentProject = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return null;
    const dom = Blockly.Xml.workspaceToDom(ws);
    const blocklyXml = Blockly.Xml.domToText(dom);
    const allBlocks = ws.getAllBlocks();
    const blockDetails = allBlocks.map((b) => {
      const fieldValues: Record<string, any> = {};
      b.inputList.forEach((input) => {
        input.fieldRow.forEach((field) => {
          if (field.name) {
            fieldValues[field.name] = field.getValue();
          }
        });
      });
      return {
        id: b.id,
        type: b.type,
        fields: fieldValues,
        parentId: b.getParent()?.id || null,
      };
    });

    return {
      title: projectTitleRef.current,
      sprite: { ...currentSpriteRef.current },
      blocklyXml,
      blocks: blockDetails,
      telemetry: telemetryRef.current,
    };
  }, []);

  // Lưu dự án vào CSDL hoặc LocalStorage (thủ công hoặc tự động)
  const handleSaveProject = useCallback(async (isAuto = false) => {
    if (lesson) return; // Không lưu đè lên bài tập của khóa học
    const pData = serializeCurrentProject();
    if (!pData) return;

    setSaveStatus('saving');
    try {
      const token = localStorage.getItem('iqkids_auth_token');
      if (!token) {
        localStorage.setItem('iqkids_scratch_draft', JSON.stringify(pData));
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        return;
      }

      if (currentProjectIdRef.current) {
        const updated = await api.scratch.updateProject(currentProjectIdRef.current, {
          title: projectTitleRef.current,
          project_data: pData,
        });
        if (onProjectChange) onProjectChange(updated);
      } else {
        const created = await api.scratch.createProject({
          title: projectTitleRef.current,
          project_data: pData,
        });
        currentProjectIdRef.current = created.id;
        setProjectId(created.id);
        if (onProjectChange) onProjectChange(created);
      }

      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      if (!isAuto) {
        playSynthSound('victory');
        setStatusMessage('Đã lưu dự án Scratch thành công! 💾');
      }
    } catch (err: any) {
      console.error('[ScratchStudio] Lỗi lưu dự án:', err);
      setSaveStatus('unsaved');
      if (!isAuto) {
        setStatusMessage(`Lỗi lưu dự án: ${err.message || 'Vui lòng thử lại!'}`);
      }
    }
  }, [lesson, onProjectChange, serializeCurrentProject]);

  // Kích hoạt debounce autosave 3 giây
  const triggerAutosave = useCallback(() => {
    if (lesson) return;
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      handleSaveProject(true);
    }, 3000);
  }, [handleSaveProject, lesson]);

  // Nạp dự án khi có initialProjectId
  useEffect(() => {
    if (!initialProjectId) return;
    api.scratch.getProject(initialProjectId).then((proj) => {
      setProjectId(proj.id);
      currentProjectIdRef.current = proj.id;
      setProjectTitle(proj.title);
      projectTitleRef.current = proj.title;
      let pData = proj.project_data;
      if (typeof pData === 'string') {
        try { pData = JSON.parse(pData); } catch (e) {}
      }
      if (pData?.sprite) {
        setSprite(pData.sprite);
      }
      if (pData?.blocklyXml) {
        loadWorkspaceXml(pData.blocklyXml);
      }
      setSaveStatus('saved');
    }).catch((err) => {
      console.error('[ScratchStudio] Lỗi tải dự án ban đầu:', err);
    });
  }, [initialProjectId, loadWorkspaceXml]);

  // Khởi tạo Blockly Workspace
  useEffect(() => {
    registerScratchBlocks();

    if (!blocklyDivRef.current) return;

    // Dispose workspace cũ nếu đã có
    if (workspaceRef.current) {
      workspaceRef.current.dispose();
      workspaceRef.current = null;
    }

    try {
      const ws = Blockly.inject(blocklyDivRef.current, {
        toolbox: SCRATCH_TOOLBOX_XML,
        trashcan: true,
        scrollbars: true,
        sounds: false,
        media: '',
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.85,
          maxScale: 1.8,
          minScale: 0.5,
          scaleSpeed: 1.15,
        },
        grid: {
          spacing: 25,
          length: 3,
          colour: '#E2E8F0',
          snap: false,
        },
      });

      workspaceRef.current = ws;

      // Nạp kịch bản mẫu ban đầu
      let starterXml = STARTER_FLAG_SCRIPT_XML;
      if (lesson?.start_scene_json) {
        try {
          const parsed = typeof lesson.start_scene_json === 'string' 
            ? JSON.parse(lesson.start_scene_json) 
            : lesson.start_scene_json;
          if (parsed.starter_xml) {
            starterXml = parsed.starter_xml;
          }
        } catch (e) {
          // fallback default starter
        }
      }

      try {
        const dom = Blockly.utils.xml.textToDom(starterXml);
        Blockly.Xml.domToWorkspace(dom, ws);
      } catch (err) {
        console.warn('[ScratchStudio] Không thể nạp starter xml:', err);
      }

      // Đăng ký bộ lắng nghe thay đổi để tự động lưu (debounced autosave)
      const changeListener = (e: any) => {
        if (e.isUiEvent || e.type === Blockly.Events.VIEWPORT_CHANGE) return;
        triggerAutosave();
      };
      ws.addChangeListener(changeListener);

      // Kích thước chuẩn ban đầu
      Blockly.svgResize(ws);

      // Xử lý ResizeObserver để Workspace luôn khít khung chứa
      const resizeObserver = new ResizeObserver(() => {
        if (ws) {
          Blockly.svgResize(ws);
        }
      });
      resizeObserver.observe(blocklyDivRef.current);

      return () => {
        ws.removeChangeListener(changeListener);
        resizeObserver.disconnect();
        if (workspaceRef.current) {
          workspaceRef.current.dispose();
          workspaceRef.current = null;
        }
      };
    } catch (e) {
      console.error('[ScratchStudio] Lỗi khởi tạo Blockly:', e);
    }
  }, [lesson, triggerAutosave]);

  // Dừng thực thi kịch bản
  const handleStop = () => {
    playSynthSound('click');
    isCancelledRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    if (workspaceRef.current) {
      workspaceRef.current.highlightBlock(null);
    }
    setSprite((prev) => ({ ...prev, speechBubble: null }));
    setStatusMessage('Đã dừng kịch bản.');
  };

  // Đặt lại vị trí Chú Khỉ về ban đầu
  const handleResetStage = () => {
    handleStop();
    setSprite(INITIAL_SPRITE_STATE);
    telemetryRef.current = {
      has_run: false,
      final_state: INITIAL_SPRITE_STATE,
      actions: {
        total_steps: 0,
        total_turns: 0,
        messages_said: [],
        sounds_played: [],
      },
    };
    setStatusMessage('Đã đưa Chú Khỉ về tâm sân khấu (0, 0).');
  };

  // Helper chờ theo mili giây có hỗ trợ hủy
  const waitMs = (ms: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (isCancelledRef.current) {
          clearInterval(interval);
          resolve(false);
        } else if (Date.now() - start >= ms) {
          clearInterval(interval);
          resolve(true);
        }
      }, 20);
    });
  };

  // Đánh giá điều kiện Boolean cho khối Nếu...Thì (Conditionals / Sensing)
  const evaluateCondition = (condBlock: Blockly.Block | null): boolean => {
    if (!condBlock) return false;
    const type = condBlock.type;
    if (type === 'scratch_touching_edge') {
      const s = currentSpriteRef.current;
      return Math.abs(s.x) >= 180 || Math.abs(s.y) >= 130;
    }
    if (type === 'scratch_touching_mouse') {
      return true;
    }
    return true;
  };

  // Bộ thực thi khối lệnh (Interpreter)
  const executeBlockChain = async (startBlock: Blockly.Block | null) => {
    let curr = startBlock;

    while (curr && !isCancelledRef.current) {
      const type = curr.type;
      const ws = workspaceRef.current;
      if (ws) {
        ws.highlightBlock(curr.id);
      }

      // 1. MOTION BLOCKS
      if (type === 'scratch_move_steps') {
        const steps = Number(curr.getFieldValue('STEPS')) || 10;
        telemetryRef.current.actions.total_steps += Math.abs(steps);
        // Scratch: 0° = Lên, 90° = Phải, 180° = Xuống, 270° = Trái
        const rad = (currentSpriteRef.current.direction * Math.PI) / 180;
        const dx = steps * Math.sin(rad);
        const dy = steps * Math.cos(rad);

        setSprite((prev) => {
          let nx = prev.x + dx;
          let ny = prev.y + dy;
          // Giữ trong biên sân khấu
          nx = Math.max(-240, Math.min(240, nx));
          ny = Math.max(-180, Math.min(180, ny));
          return { ...prev, x: nx, y: ny };
        });
        playSynthSound('click');
        const cont = await waitMs(150);
        if (!cont) break;
      } else if (type === 'scratch_turn_right') {
        const deg = Number(curr.getFieldValue('DEGREES')) || 15;
        telemetryRef.current.actions.total_turns += deg;
        setSprite((prev) => ({
          ...prev,
          direction: (prev.direction + deg) % 360,
        }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_turn_left') {
        const deg = Number(curr.getFieldValue('DEGREES')) || 15;
        telemetryRef.current.actions.total_turns += deg;
        setSprite((prev) => ({
          ...prev,
          direction: (prev.direction - deg + 360) % 360,
        }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_goto_xy') {
        const x = Number(curr.getFieldValue('X')) || 0;
        const y = Number(curr.getFieldValue('Y')) || 0;
        setSprite((prev) => ({
          ...prev,
          x: Math.max(-240, Math.min(240, x)),
          y: Math.max(-180, Math.min(180, y)),
        }));
        playSynthSound('click');
        const cont = await waitMs(150);
        if (!cont) break;
      } else if (type === 'scratch_point_direction') {
        const dir = Number(curr.getFieldValue('DIRECTION')) || 90;
        setSprite((prev) => ({ ...prev, direction: dir }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_change_x_by') {
        const dx = Number(curr.getFieldValue('DX')) || 10;
        telemetryRef.current.actions.total_steps += Math.abs(dx);
        setSprite((prev) => ({
          ...prev,
          x: Math.max(-240, Math.min(240, prev.x + dx)),
        }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_change_y_by') {
        const dy = Number(curr.getFieldValue('DY')) || 10;
        telemetryRef.current.actions.total_steps += Math.abs(dy);
        setSprite((prev) => ({
          ...prev,
          y: Math.max(-180, Math.min(180, prev.y + dy)),
        }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_bounce_on_edge') {
        setSprite((prev) => {
          let newDir = prev.direction;
          if (prev.x >= 230 || prev.x <= -230) {
            newDir = (360 - newDir) % 360;
          }
          if (prev.y >= 170 || prev.y <= -170) {
            newDir = (180 - newDir + 360) % 360;
          }
          return { ...prev, direction: newDir };
        });
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      }

      // 2. LOOKS BLOCKS
      else if (type === 'scratch_say_for_secs') {
        const msg = String(curr.getFieldValue('MESSAGE') || 'Xin chào!');
        telemetryRef.current.actions.messages_said.push(msg);
        const secs = Number(curr.getFieldValue('SECS')) || 2;
        setSprite((prev) => ({
          ...prev,
          speechBubble: { text: msg, type: 'say' },
        }));
        playSynthSound('powerup');
        const cont = await waitMs(secs * 1000);
        setSprite((prev) => ({ ...prev, speechBubble: null }));
        if (!cont) break;
      } else if (type === 'scratch_say') {
        const msg = String(curr.getFieldValue('MESSAGE') || 'Xin chào!');
        telemetryRef.current.actions.messages_said.push(msg);
        setSprite((prev) => ({
          ...prev,
          speechBubble: { text: msg, type: 'say' },
        }));
        playSynthSound('powerup');
        const cont = await waitMs(300);
        if (!cont) break;
      } else if (type === 'scratch_change_size_by') {
        const delta = Number(curr.getFieldValue('CHANGE')) || 10;
        setSprite((prev) => ({
          ...prev,
          size: Math.max(20, Math.min(300, prev.size + delta)),
        }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_set_size_to') {
        const sz = Number(curr.getFieldValue('SIZE')) || 100;
        setSprite((prev) => ({
          ...prev,
          size: Math.max(20, Math.min(300, sz)),
        }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_show') {
        setSprite((prev) => ({ ...prev, visible: true }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_hide') {
        setSprite((prev) => ({ ...prev, visible: false }));
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      }

      // 3. SOUND BLOCKS
      else if (type === 'scratch_play_sound_meow') {
        telemetryRef.current.actions.sounds_played.push('meow');
        playSynthSound('meow');
        const cont = await waitMs(500);
        if (!cont) break;
      } else if (type === 'scratch_play_drum') {
        const beats = Math.max(1, Math.min(20, Math.round(Number(curr.getFieldValue('DRUM')) || 1)));
        const secs = Math.max(0.05, Number(curr.getFieldValue('SECS')) || 0.25);
        for (let b = 0; b < beats && !isCancelledRef.current; b++) {
          telemetryRef.current.actions.sounds_played.push('drum');
          playSynthSound('drum');
          const cont = await waitMs(secs * 1000);
          if (!cont) break;
        }
      }

      // 4. CONTROL BLOCKS
      else if (type === 'scratch_wait_secs') {
        const secs = Number(curr.getFieldValue('SECS')) || 1;
        const cont = await waitMs(secs * 1000);
        if (!cont) break;
      } else if (type === 'scratch_repeat') {
        const times = Number(curr.getFieldValue('TIMES')) || 10;
        const subBlock = curr.getInputTargetBlock('SUBSTACK');
        for (let i = 0; i < times && !isCancelledRef.current; i++) {
          if (subBlock) {
            await executeBlockChain(subBlock);
          }
        }
      } else if (type === 'scratch_forever') {
        const subBlock = curr.getInputTargetBlock('SUBSTACK');
        while (!isCancelledRef.current) {
          if (subBlock) {
            await executeBlockChain(subBlock);
          } else {
            await waitMs(100);
          }
        }
      } else if (type === 'scratch_if') {
        const condBlock = curr.getInputTargetBlock('CONDITION');
        const isTrue = evaluateCondition(condBlock);
        if (isTrue) {
          const subBlock = curr.getInputTargetBlock('SUBSTACK');
          if (subBlock) {
            await executeBlockChain(subBlock);
          }
        }
      } else if (type === 'scratch_if_else') {
        const condBlock = curr.getInputTargetBlock('CONDITION');
        const isTrue = evaluateCondition(condBlock);
        if (isTrue) {
          const subBlock = curr.getInputTargetBlock('SUBSTACK');
          if (subBlock) {
            await executeBlockChain(subBlock);
          }
        } else {
          const elseSubBlock = curr.getInputTargetBlock('ELSE_SUBSTACK');
          if (elseSubBlock) {
            await executeBlockChain(elseSubBlock);
          }
        }
      }

      // 5. VARIABLES BLOCKS
      else if (type === 'scratch_set_variable_to') {
        const varName = String(curr.getFieldValue('VAR') || 'điểm');
        const val = Number(curr.getFieldValue('VALUE')) || 0;
        variablesRef.current[varName] = val;
        if (!telemetryRef.current.variables) telemetryRef.current.variables = {};
        telemetryRef.current.variables[varName] = val;
        setStatusMessage(`🔢 Biến [${varName}] = ${val}`);
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      } else if (type === 'scratch_change_variable_by') {
        const varName = String(curr.getFieldValue('VAR') || 'điểm');
        const delta = Number(curr.getFieldValue('CHANGE')) || 1;
        const cur = variablesRef.current[varName] || 0;
        const newVal = cur + delta;
        variablesRef.current[varName] = newVal;
        if (!telemetryRef.current.variables) telemetryRef.current.variables = {};
        telemetryRef.current.variables[varName] = newVal;
        setStatusMessage(`🔢 Biến [${varName}] = ${newVal}`);
        playSynthSound('click');
        const cont = await waitMs(100);
        if (!cont) break;
      }

      // 6. BROADCAST BLOCKS
      else if (type === 'scratch_broadcast_message') {
        const msg = String(curr.getFieldValue('MESSAGE') || 'thông_báo_1');
        if (!telemetryRef.current.actions.messages_broadcasted) {
          telemetryRef.current.actions.messages_broadcasted = [];
        }
        telemetryRef.current.actions.messages_broadcasted.push(msg);
        setStatusMessage(`📢 Đã phát tin: "${msg}"`);
        playSynthSound('powerup');
        // Kích hoạt các khối scratch_when_receive_message phù hợp
        const ws = workspaceRef.current;
        if (ws) {
          const receiveBlocks = ws.getAllBlocks().filter(
            (b) => b.type === 'scratch_when_receive_message' && b.getFieldValue('MESSAGE') === msg && !b.getParent()
          );
          for (const rb of receiveBlocks) {
            executeBlockChain(rb.getNextBlock());
          }
        }
        const cont = await waitMs(200);
        if (!cont) break;
      }

      // Tiến tới khối tiếp theo được gắn bên dưới
      curr = curr.getNextBlock();
    }

    if (workspaceRef.current) {
      workspaceRef.current.highlightBlock(null);
    }
  };

  // Khởi động chạy kịch bản khi bấm Cờ Xanh
  const handleRun = async () => {
    // Mở khóa AudioContext ngay trong gesture handler của user
    getAudioContext();

    if (isRunning) {
      handleStop();
      return;
    }

    const ws = workspaceRef.current;
    if (!ws) return;

    // Tìm tất cả các khối Mũ "Khi bấm cờ xanh"
    const allBlocks = ws.getAllBlocks();
    const flagBlocks = allBlocks.filter(
      (b) => b.type === 'scratch_when_flag_clicked' && !b.getParent()
    );

    if (flagBlocks.length === 0) {
      setStatusMessage('💡 Hãy kéo khối "khi bấm vào cờ xanh ⛳" vào vùng làm việc để bắt đầu!');
      playSynthSound('incorrect');
      return;
    }

    isCancelledRef.current = false;
    isRunningRef.current = true;
    setIsRunning(true);
    // Đánh dấu đã chạy kịch bản
    telemetryRef.current.has_run = true;
    setStatusMessage('Đang thực thi kịch bản Scratch... 🚀');
    playSynthSound('powerup');

    try {
      // Chạy song song tất cả các nhánh có gắn cờ xanh
      await Promise.all(
        flagBlocks.map((fb) => executeBlockChain(fb.getNextBlock()))
      );
      if (!isCancelledRef.current) {
        setStatusMessage('Hoàn thành kịch bản! 🎉');
        playSynthSound('victory');
      }
    } catch (err) {
      console.error('[ScratchStudio] Lỗi khi chạy kịch bản:', err);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      telemetryRef.current.final_state = { ...currentSpriteRef.current };
      if (workspaceRef.current) {
        workspaceRef.current.highlightBlock(null);
      }
    }
  };

  // Xử lý khi bấm vào chú Khỉ trên Sân Khấu
  const handleSpriteClick = async () => {
    // Mở khóa AudioContext ngay trong click event
    getAudioContext();

    if (isRunning) return;
    const ws = workspaceRef.current;
    if (!ws) return;

    const spriteClickedBlocks = ws
      .getAllBlocks()
      .filter((b) => b.type === 'scratch_when_sprite_clicked' && !b.getParent());

    telemetryRef.current.has_run = true;

    if (spriteClickedBlocks.length > 0) {
      isCancelledRef.current = false;
      isRunningRef.current = true;
      setIsRunning(true);
      playSynthSound('powerup');

      try {
        await Promise.all(
          spriteClickedBlocks.map((b) => executeBlockChain(b.getNextBlock()))
        );
      } finally {
        setIsRunning(false);
        isRunningRef.current = false;
        telemetryRef.current.final_state = { ...currentSpriteRef.current };
      }
    } else {
      // Mặc định chào vui nhộn và rung nhẹ nếu không có khối gắn
      telemetryRef.current.actions.sounds_played.push('meow');
      telemetryRef.current.actions.messages_said.push('Khỉ con chào bạn! 🐒');
      telemetryRef.current.final_state = { ...currentSpriteRef.current };
      playSynthSound('powerup');
      setSprite((prev) => ({
        ...prev,
        speechBubble: { text: 'Khỉ con chào bạn! 🐒', type: 'say' },
      }));
      setTimeout(() => {
        setSprite((prev) => ({ ...prev, speechBubble: null }));
      }, 1500);
    }
  };

  // Lắng nghe sự kiện bàn phím cho các khối "khi bấm phím"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const ws = workspaceRef.current;
      if (!ws) return;

      const keyBlocks = ws.getAllBlocks().filter(
        (b) => b.type === 'scratch_when_key_pressed' && !b.getParent()
      );

      for (const kb of keyBlocks) {
        const opt = kb.getFieldValue('KEY_OPTION');
        let match = false;
        if (opt === 'any') match = true;
        else if (opt === 'space' && e.code === 'Space') match = true;
        else if (opt === e.key || opt === e.code) match = true;

        if (match) {
          getAudioContext();
          telemetryRef.current.has_run = true;
          executeBlockChain(kb.getNextBlock());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Trích xuất cấu trúc mã khối và telemetry để nộp bài
  const handleExtractAndSubmit = () => {
    const ws = workspaceRef.current;
    if (!ws) return;

    const allBlocks = ws.getAllBlocks();
    // 1. Lấy danh sách các khối theo thứ tự thực thi từ khối Mũ (Flag, Sprite click, Key press, Message)
    const hatBlock = allBlocks.find(
      (b) => b.type.startsWith('scratch_when_') && !b.getParent()
    );

    const sequence: string[] = [];
    let curr: Blockly.Block | null = hatBlock || null;

    while (curr) {
      sequence.push(curr.type);
      curr = curr.getNextBlock();
    }

    if (sequence.length === 0) {
      // Lấy toàn bộ các khối nếu không có khối Mũ
      allBlocks.forEach((b) => sequence.push(b.type));
    }

    // 2. Thu thập chi tiết AST và tham số cấu hình của từng khối
    const blockDetails = allBlocks.map((b) => {
      const fieldValues: Record<string, any> = {};
      b.inputList.forEach((input) => {
        input.fieldRow.forEach((field) => {
          if (field.name) {
            fieldValues[field.name] = field.getValue();
          }
        });
      });
      return {
        id: b.id,
        type: b.type,
        fields: fieldValues,
        parentId: b.getParent()?.id || null,
      };
    });

    // Cập nhật trạng thái cuối cùng và biến số
    telemetryRef.current.final_state = { ...currentSpriteRef.current };
    telemetryRef.current.variables = { ...variablesRef.current };

    // 3. Payload giàu ngữ nghĩa cho Semantic Evaluator
    const richPayload = {
      engine: 'scratch_studio',
      sequence,
      blocks: blockDetails,
      telemetry: telemetryRef.current,
    };

    playSynthSound('victory');
    if (onLessonComplete) {
      onLessonComplete(richPayload);
    }
  };

  // Xuất file MIT Scratch 3.0 (.sb3 package)
  const handleExportSb3 = async () => {
    try {
      const pData = serializeCurrentProject();
      if (!pData) return;
      const blob = await api.scratch.exportSb3(
        {
          title: projectTitle,
          project_data: pData,
        },
        projectId || undefined,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = projectTitle.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'du_an_scratch';
      a.download = `${safeTitle}.sb3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playSynthSound('victory');
      setStatusMessage('Đã tải xuống gói MIT Scratch 3.0 (.sb3) thành công! 📦');
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất .sb3: ${err.message || 'Thử lại sau'}`);
    }
  };

  // Xuất file JSON cấu trúc Scratch Studio
  const handleExportJson = () => {
    try {
      const pData = serializeCurrentProject();
      if (!pData) return;
      const blob = new Blob([JSON.stringify(pData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = projectTitle.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'du_an_scratch';
      a.download = `${safeTitle}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playSynthSound('victory');
      setStatusMessage('Đã xuất file cấu trúc Scratch Studio (.json)! 📄');
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất JSON: ${err.message || 'Thử lại sau'}`);
    }
  };

  // Nhập file từ máy tính (.sb3 hoặc .json)
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.sb3')) {
        const res = await api.scratch.importSb3(file, true);
        if (res.project) {
          if (res.project.title) {
            setProjectTitle(res.project.title);
            projectTitleRef.current = res.project.title;
          }
          if (res.project.sprite) {
            setSprite((prev) => ({ ...prev, ...res.project.sprite }));
          }
          if (res.project.blocklyXml) {
            loadWorkspaceXml(res.project.blocklyXml);
          }
          if (res.saved_project_id) {
            setProjectId(res.saved_project_id);
            currentProjectIdRef.current = res.saved_project_id;
          }
        }
        playSynthSound('victory');
        setStatusMessage('Đã nhập và mở file Scratch 3.0 (.sb3) thành công! 🎉');
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.title) {
          setProjectTitle(parsed.title);
          projectTitleRef.current = parsed.title;
        }
        if (parsed.sprite) {
          setSprite((prev) => ({ ...prev, ...parsed.sprite }));
        }
        if (parsed.blocklyXml) {
          loadWorkspaceXml(parsed.blocklyXml);
        }
        playSynthSound('victory');
        setStatusMessage('Đã nhập cấu trúc dự án JSON thành công! 📄');
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi nhập file: ${err.message || 'Định dạng không hợp lệ'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Nhân bản dự án hiện tại
  const handleDuplicate = async () => {
    if (!projectId) {
      // Nếu chưa lưu, lưu trước rồi nhân bản
      await handleSaveProject(false);
    }
    if (!currentProjectIdRef.current) return;
    try {
      const dup = await api.scratch.duplicateProject(currentProjectIdRef.current);
      setProjectId(dup.id);
      currentProjectIdRef.current = dup.id;
      setProjectTitle(dup.title);
      projectTitleRef.current = dup.title;
      if (onProjectChange) onProjectChange(dup);
      playSynthSound('victory');
      setStatusMessage(`Đã nhân bản thành công: "${dup.title}"! 👯`);
    } catch (err: any) {
      setStatusMessage(`Lỗi nhân bản: ${err.message || 'Thử lại sau'}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left w-full">
      {/* 1. Thanh Tiêu Đề Điều Khiển & Quản Lý Dự Án */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md select-none shrink-0" title="Linh vật Khỉ Thông Thái">
              🐒
            </div>
            <div>
              {lesson ? (
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-800">{lesson.title}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wide">
                      Bài Học Scratch
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{lesson.content}</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => {
                        setProjectTitle(e.target.value);
                        projectTitleRef.current = e.target.value;
                        triggerAutosave();
                      }}
                      placeholder="Đặt tên dự án Scratch..."
                      className="font-black text-base text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-slate-100 px-2 py-0.5 rounded-lg border-b border-transparent focus:border-indigo-500 outline-none transition-all w-48 sm:w-64"
                    />

                    {saveStatus === 'saving' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Đang lưu...</span>
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Đã lưu {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                      </span>
                    )}
                    {saveStatus === 'unsaved' && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        ⚪ Chưa lưu
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 px-2">
                    Tự động lưu sau 3 giây • Chuẩn MIT Scratch 3.0 (.sb3)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động phải */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút lưu thủ công */}
          {!lesson && (
            <button
              onClick={() => handleSaveProject(false)}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer border border-indigo-200"
              title="Lưu dự án ngay lập tức"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Dự Án</span>
            </button>
          )}

          {/* Nút nhân bản */}
          {!lesson && projectId && (
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Nhân bản dự án này thành bản sao mới"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Nhân Bản</span>
            </button>
          )}

          {/* Nút Xuất Menu (.sb3 / .json) */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Tùy chọn xuất file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs text-left">
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    handleExportSb3();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-amber-50 flex items-center gap-2 font-bold text-slate-700 hover:text-amber-800 cursor-pointer"
                >
                  <span className="text-base">📦</span>
                  <div>
                    <div>Xuất file .sb3 (Scratch 3.0)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Mở được trên scratch.mit.edu</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    handleExportJson();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center gap-2 font-bold text-slate-700 hover:text-indigo-800 cursor-pointer border-t border-slate-100"
                >
                  <span className="text-base">📄</span>
                  <div>
                    <div>Xuất file .json (Studio)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Định dạng JSON gọn nhẹ</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Nút Nhập File (.sb3 / .json) */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".sb3,.json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Nhập file .sb3 hoặc .json từ máy tính của bạn"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập File</span>
            </button>
          </div>

          {/* Nút Nộp Bài nếu là Lesson */}
          {lesson && onLessonComplete && (
            <button
              onClick={handleExtractAndSubmit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Nộp Bài Làm (+{lesson.xp_reward || 100} XP)</span>
            </button>
          )}

          {/* Nút Làm lại sân khấu */}
          {!lesson && (
            <button
              onClick={handleResetStage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Đặt lại Chú Khỉ về tâm sân khấu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm Lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông báo trạng thái nếu có */}
      {statusMessage && (
        <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-semibold text-indigo-900 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile Segmented Switcher for Workspace vs Stage */}
      <div className="lg:hidden flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => handleSwitchMobileTab('workspace')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileStudioTab === 'workspace'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>🧱 Khối Lệnh (Code)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMobileTab('stage')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileStudioTab === 'stage'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>🎬 Sân Khấu (Stage)</span>
        </button>
      </div>

      {/* 2. Khung Làm Việc Chính: Chia Cột Workspace (Trái) & Sân Khấu (Phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Cột Trái / Giữa: Blockly Workspace (7 hoặc 8 cột trên màn lớn) */}
        <div className={`lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[520px] ${
          mobileStudioTab === 'workspace' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Không Gian Kéo Thả Khối Lệnh (Blockly Workspace)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Kéo khối từ danh mục màu bên trái
            </span>
          </div>

          {/* Container chứa Blockly SVG */}
          <div className="relative w-full flex-1 min-h-[460px] overflow-hidden bg-slate-50/50">
            <div
              ref={blocklyDivRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        {/* Cột Phải: Sân Khấu 480x360 (5 hoặc 4 cột) */}
        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-4 ${
          mobileStudioTab === 'stage' ? 'flex' : 'hidden lg:flex'
        }`}>
          <ScratchStage
            sprite={sprite}
            isRunning={isRunning}
            onRun={handleRun}
            onStop={handleStop}
            onReset={handleResetStage}
            onSpriteClick={handleSpriteClick}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
          />

          {/* Hướng dẫn nhanh cho bé */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Bí kíp lập trình Scratch</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-500 text-[11px] leading-relaxed">
              <li>Mỗi kịch bản bắt đầu bằng khối <strong className="text-amber-600">khi bấm cờ xanh ⛳</strong></li>
              <li>Thử nối khối <strong className="text-blue-600">di chuyển 10 bước</strong> và <strong className="text-purple-600">nói Xin chào</strong></li>
              <li>Bấm vào hình Chú Khỉ trên Sân Khấu để tương tác trực tiếp!</li>
              <li>Bật <strong className="text-indigo-600">Lưới X-Y 📐</strong> để xem vị trí tọa độ của Chú Khỉ con.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
