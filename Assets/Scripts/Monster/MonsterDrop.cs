using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class DropItem
{
    public string itemName;
    public float dropRate; // 0~1
}

public class MonsterDrop : MonoBehaviour
{
    public List<DropItem> drops = new List<DropItem>();

    public void Drop()
    {
        foreach (var item in drops)
        {
            if (Random.value < item.dropRate)
                Debug.Log($"Dropped: {item.itemName}");
        }
    }
}
