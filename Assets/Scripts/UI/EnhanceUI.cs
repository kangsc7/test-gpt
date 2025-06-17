using UnityEngine;
using UnityEngine.UI;

public class EnhanceUI : MonoBehaviour
{
    public Text itemNameText;
    public Text enhanceLevelText;
    public Text resultText;
    public Button enhanceButton;

    private int enhanceLevel = 0;

    void Start()
    {
        enhanceButton.onClick.AddListener(TryEnhance);
        UpdateUI();
    }

    void TryEnhance()
    {
        if (enhanceLevel >= 20)
        {
            resultText.text = "최대 강화입니다.";
            return;
        }

        float chance = Mathf.Lerp(0.95f, 0.3f, enhanceLevel / 20f);
        if (Random.value < chance)
        {
            enhanceLevel++;
            resultText.text = $"성공! +{enhanceLevel}";
        }
        else
        {
            resultText.text = "실패";
        }
        UpdateUI();
    }

    void UpdateUI()
    {
        itemNameText.text = "강화 무기";
        enhanceLevelText.text = $"+{enhanceLevel}";
    }
}
