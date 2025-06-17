using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class MonsterAI : MonoBehaviour
{
    public float maxHP = 100;
    public Transform target;

    private float currentHP;
    private NavMeshAgent agent;

    void Start()
    {
        currentHP = maxHP;
        agent = GetComponent<NavMeshAgent>();
    }

    void Update()
    {
        if (target != null)
            agent.SetDestination(target.position);
    }

    public void TakeDamage(float damage)
    {
        currentHP -= damage;
        if (currentHP <= 0) Die();
    }

    void Die()
    {
        Destroy(gameObject);
    }
}
