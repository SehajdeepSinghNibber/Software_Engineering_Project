import torch
import lpips
from skimage.metrics import peak_signal_noise_ratio, structural_similarity

device = "cuda" if torch.cuda.is_available() else "cpu"
loss_fn = lpips.LPIPS(net="alex").to(device)

def compute_metrics(gt_rgb, pred_rgb):
    psnr = peak_signal_noise_ratio(gt_rgb, pred_rgb, data_range=255)
    ssim = structural_similarity(gt_rgb, pred_rgb, channel_axis=2, data_range=255)
    
    pred_t = torch.from_numpy(pred_rgb).permute(2, 0, 1).unsqueeze(0).float().to(device) / 127.5 - 1.0
    gt_t = torch.from_numpy(gt_rgb).permute(2, 0, 1).unsqueeze(0).float().to(device) / 127.5 - 1.0
    with torch.no_grad():
        lpips_val = loss_fn(pred_t, gt_t).item()
        
    return psnr, ssim, lpips_val
